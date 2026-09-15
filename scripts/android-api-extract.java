// Read the PUBLIC surface of a published Android AAR and print it as JSON.
//
// ★THE GOVERNING RULE, and the reason this file exists at all:
//
//     A SYMBOL ENTERS THE REFERENCE ONLY IF THE SHIPPED INTERFACE AND THE
//     SHIPPED RUNTIME AGREE ON IT. WHERE THEY DISAGREE, SAY SO RATHER THAN
//     PICK ONE.
//
// It was paid for twice before this file was written. On the Apple surface
// `pullPos()` exists in the shipped `.a` as a local symbol and appears in no
// `.swiftinterface`. In the Python wheel `Avatar.__init__(self, engine,
// engine_id, armed=True)` is on the runtime class and in no stub, while `Audio`
// is declared by the stub and raises ImportError. Either single source of truth
// publishes something false. So this file NEVER reads a source tree, a
// `-sources.jar` or a `-javadoc.jar` — it reads the `.aar` a Gradle build
// resolves, and it reads BOTH of the things inside it that describe an API:
//
//   THE DECLARED SURFACE   the Kotlin metadata — the `@kotlin.Metadata`
//                          annotation the compiler stamps on every class, and
//                          `META-INF/*.kotlin_module`. This is what the Kotlin
//                          compiler believes when it compiles a caller:
//                          visibility as Kotlin means it (`internal` is
//                          `public` in the bytecode), nullability, default
//                          arguments, `suspend`, typealiases — none of which the
//                          class file alone can state. `javap` gives the
//                          Java-erased view and would misstate all of them.
//   THE RUNTIME SURFACE    the class files in `classes.jar`, read by a
//                          class-file parser (ASM): every class that is there,
//                          its access flags, every method and field with its
//                          JVM name and descriptor. This is what an app's
//                          class loader binds to.
//
// The bridge between the two is exact: the Kotlin metadata records, for every
// declared function, property accessor and constructor, the JVM signature it
// compiled to. So each declared public member is looked up in the runtime by
// that signature, and each public runtime member is claimed by at most one
// declared public member. Whatever is left over on either side is a
// disagreement and is RECORDED, never dropped:
//
//   per class
//   `loadable_undeclared`   public in the class file, absent from the declared
//                           public surface. Each row is classified so the page
//                           can count the compiler's own output — `$default`
//                           bridges, `@JvmOverloads` overloads, `@JvmStatic`
//                           copies, `Companion`/`INSTANCE` holders, enum
//                           statics, synthetics — and NAME the rest: members
//                           the metadata marks `internal` (public in the
//                           bytecode, a Java caller can call them, a Kotlin
//                           caller cannot) and anything unexplained.
//   `not_loadable`          declared public by the metadata with no public
//                           class-file member behind it.
//   per artifact
//   `internal_classes`      classes the metadata marks `internal` or `private`
//                           that the class file marks `public`.
//   typealiases             declared by a file facade and having NO runtime
//                           form at all: a Java caller cannot see them and a
//                           Kotlin caller can only see them.
//
// Runs in Java source-file mode with three pinned, digest-verified jars on the
// class path — scripts/gen-android-api.mjs fetches them and invokes this:
//
//   java -cp kotlin-metadata-jvm.jar:kotlin-stdlib.jar:asm.jar \
//        scripts/android-api-extract.java <artifact>.aar
//
// Determinism: classes and members are sorted by name, then descriptor; nothing
// depends on the filesystem layout of a checkout or on the JDK that ran it.

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;

import kotlin.metadata.Attributes;
import kotlin.metadata.ClassKind;
import kotlin.metadata.KmClass;
import kotlin.metadata.KmClassifier;
import kotlin.metadata.KmConstructor;
import kotlin.metadata.KmEnumEntry;
import kotlin.metadata.KmFunction;
import kotlin.metadata.KmPackage;
import kotlin.metadata.KmProperty;
import kotlin.metadata.KmType;
import kotlin.metadata.KmTypeAlias;
import kotlin.metadata.KmTypeParameter;
import kotlin.metadata.KmTypeProjection;
import kotlin.metadata.KmValueParameter;
import kotlin.metadata.KmVariance;
import kotlin.metadata.Visibility;
import kotlin.metadata.jvm.JvmExtensionsKt;
import kotlin.metadata.jvm.JvmFieldSignature;
import kotlin.metadata.jvm.JvmMetadataUtil;
import kotlin.metadata.jvm.JvmMethodSignature;
import kotlin.metadata.jvm.KotlinClassMetadata;
import kotlin.metadata.jvm.KotlinModuleMetadata;
import kotlin.metadata.jvm.KmModule;
import kotlin.metadata.jvm.KmPackageParts;

import org.objectweb.asm.AnnotationVisitor;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.FieldVisitor;
import org.objectweb.asm.MethodVisitor;
import org.objectweb.asm.Opcodes;

public class AndroidApiExtract {

  /* ------------------------------------------------------------ the runtime */

  static final class RtMember {
    String name, descriptor;
    int access;
    boolean isField;
    Object constant;          // a static final field's ConstantValue, when the class file carries one
    String deprecated;        // the @Deprecated message, "" for one without, null when not deprecated
    String key() { return (isField ? "field " : "") + name + descriptor; }
  }

  /** One class file, as the class-file format describes it. */
  static final class RtClass {
    String name;             // JVM binary name with dots: ai.bithuman.x.Outer$Inner
    int access;
    String superName;
    List<String> interfaces = new ArrayList<>();
    List<RtMember> members = new ArrayList<>();
    Map<String, RtMember> byKey = new HashMap<>();
    // The @kotlin.Metadata annotation, raw, or absent.
    Integer k, xi;
    int[] mv;
    String[] d1, d2;
    String xs, pn;
    boolean hasMetadata;
  }

  /** Reads `@kotlin.Deprecated(message = …)` / `@java.lang.Deprecated`. */
  static AnnotationVisitor deprecation(RtMember m, String desc) {
    if ("Lkotlin/Deprecated;".equals(desc) || "Ljava/lang/Deprecated;".equals(desc)) {
      if (m.deprecated == null) m.deprecated = "";
      return new AnnotationVisitor(Opcodes.ASM9) {
        @Override public void visit(String n, Object v) { if ("message".equals(n)) m.deprecated = String.valueOf(v); }
      };
    }
    return null;
  }

  static RtClass readClass(byte[] bytes) {
    RtClass rc = new RtClass();
    new ClassReader(bytes).accept(new ClassVisitor(Opcodes.ASM9) {
      @Override public void visit(int version, int access, String name, String sig, String sup, String[] itf) {
        rc.name = name.replace('/', '.');
        rc.access = access;
        rc.superName = sup == null ? null : sup.replace('/', '.');
        if (itf != null) for (String i : itf) rc.interfaces.add(i.replace('/', '.'));
      }
      @Override public void visitInnerClass(String name, String outer, String inner, int access) {
        // A nested class's real access flags live on its InnerClasses entry;
        // the top-level flags of a nested class always read `public`.
        if (name.replace('/', '.').equals(rc.name)) rc.access = access;
      }
      @Override public AnnotationVisitor visitAnnotation(String desc, boolean visible) {
        if (!"Lkotlin/Metadata;".equals(desc)) return null;
        rc.hasMetadata = true;
        return new AnnotationVisitor(Opcodes.ASM9) {
          @Override public void visit(String n, Object v) {
            if ("k".equals(n)) rc.k = (Integer) v;
            else if ("xi".equals(n)) rc.xi = (Integer) v;
            else if ("xs".equals(n)) rc.xs = (String) v;
            else if ("pn".equals(n)) rc.pn = (String) v;
            else if ("mv".equals(n)) rc.mv = (int[]) v;
          }
          @Override public AnnotationVisitor visitArray(String n) {
            List<Object> items = new ArrayList<>();
            return new AnnotationVisitor(Opcodes.ASM9) {
              @Override public void visit(String nn, Object v) { items.add(v); }
              @Override public void visitEnd() {
                if ("mv".equals(n)) rc.mv = items.stream().mapToInt(o -> (Integer) o).toArray();
                else if ("d1".equals(n)) rc.d1 = items.toArray(new String[0]);
                else if ("d2".equals(n)) rc.d2 = items.toArray(new String[0]);
              }
            };
          }
        };
      }
      @Override public MethodVisitor visitMethod(int access, String name, String desc, String sig, String[] ex) {
        RtMember m = new RtMember();
        m.name = name; m.descriptor = desc; m.access = access;
        rc.members.add(m);
        return new MethodVisitor(Opcodes.ASM9) {
          @Override public AnnotationVisitor visitAnnotation(String d, boolean visible) { return deprecation(m, d); }
        };
      }
      @Override public FieldVisitor visitField(int access, String name, String desc, String sig, Object value) {
        RtMember m = new RtMember();
        m.name = name; m.descriptor = desc; m.access = access; m.isField = true; m.constant = value;
        rc.members.add(m);
        return new FieldVisitor(Opcodes.ASM9) {
          @Override public AnnotationVisitor visitAnnotation(String d, boolean visible) { return deprecation(m, d); }
        };
      }
    }, ClassReader.SKIP_CODE | ClassReader.SKIP_DEBUG | ClassReader.SKIP_FRAMES);
    rc.members.sort(Comparator.comparing((RtMember m) -> m.name).thenComparing(m -> m.descriptor));
    for (RtMember m : rc.members) rc.byKey.put(m.key(), m);
    return rc;
  }

  static boolean isPublic(int a) { return (a & Opcodes.ACC_PUBLIC) != 0; }
  static boolean isStatic(int a) { return (a & Opcodes.ACC_STATIC) != 0; }
  static boolean isSynthetic(int a) { return (a & (Opcodes.ACC_SYNTHETIC | Opcodes.ACC_BRIDGE)) != 0; }

  static List<String> flags(int a, boolean isClass) {
    List<String> out = new ArrayList<>();
    if (isPublic(a)) out.add("public");
    if ((a & Opcodes.ACC_PROTECTED) != 0) out.add("protected");
    if ((a & Opcodes.ACC_PRIVATE) != 0) out.add("private");
    if (isStatic(a)) out.add("static");
    if ((a & Opcodes.ACC_FINAL) != 0) out.add("final");
    if ((a & Opcodes.ACC_ABSTRACT) != 0) out.add("abstract");
    if (isClass && (a & Opcodes.ACC_INTERFACE) != 0) out.add("interface");
    if (isClass && (a & Opcodes.ACC_ENUM) != 0) out.add("enum");
    if (isClass && (a & Opcodes.ACC_ANNOTATION) != 0) out.add("annotation");
    if (isSynthetic(a)) out.add("synthetic");
    return out;
  }

  /* ----------------------------------------------------------- the declared */

  /** Kotlin's own spelling of a type: simple names, `?` for nullable, `<>`
   *  for arguments, `(A) -> B` for function types, the alias where the code
   *  was written against one. Deterministic, and it is the string the gate
   *  diffs, so a change in nullability or an argument is a CHANGED signature. */
  static String type(KmType t, Map<Integer, String> typeParams) {
    if (t == null) return "Unit";
    KmType abbrev = t.getAbbreviatedType();
    if (abbrev != null) return type(abbrev, typeParams);
    String base;
    KmClassifier c = t.getClassifier();
    List<KmTypeProjection> args = t.getArguments();
    if (c instanceof KmClassifier.Class) {
      String n = ((KmClassifier.Class) c).getName();
      Matcher fn = Pattern.compile("^kotlin/(?:coroutines/)?(?:jvm/functions/)?(?:Suspend)?Function(\\d+)$").matcher(n);
      if (fn.matches() && !args.isEmpty()) {
        List<String> ps = new ArrayList<>();
        for (int i = 0; i < args.size() - 1; i++) ps.add(proj(args.get(i), typeParams));
        String ret = proj(args.get(args.size() - 1), typeParams);
        String s = (Attributes.isSuspend(t) ? "suspend " : "") + "(" + String.join(", ", ps) + ") -> " + ret;
        return Attributes.isNullable(t) ? "(" + s + ")?" : s;
      }
      base = simple(n);
    } else if (c instanceof KmClassifier.TypeAlias) {
      base = simple(((KmClassifier.TypeAlias) c).getName());
    } else if (c instanceof KmClassifier.TypeParameter) {
      int id = ((KmClassifier.TypeParameter) c).getId();
      base = typeParams.getOrDefault(id, "T" + id);
    } else {
      base = "?";
    }
    if (!args.isEmpty()) {
      List<String> as = new ArrayList<>();
      for (KmTypeProjection p : args) as.add(proj(p, typeParams));
      base += "<" + String.join(", ", as) + ">";
    }
    return Attributes.isNullable(t) ? base + "?" : base;
  }

  static String proj(KmTypeProjection p, Map<Integer, String> tp) {
    if (p.getType() == null) return "*";
    String v = p.getVariance() == KmVariance.IN ? "in " : p.getVariance() == KmVariance.OUT ? "out " : "";
    return v + type(p.getType(), tp);
  }

  /** `kotlin/collections/List` -> `List`; `ai/b/Outer.Inner` -> `Outer.Inner`. */
  static String simple(String kmName) {
    int slash = kmName.lastIndexOf('/');
    return slash < 0 ? kmName : kmName.substring(slash + 1);
  }

  /** `ai/bithuman/x/Outer.Inner` -> `ai.bithuman.x.Outer$Inner`. */
  static String jvmName(String kmClassName) {
    int slash = kmClassName.lastIndexOf('/');
    String pkg = slash < 0 ? "" : kmClassName.substring(0, slash + 1).replace('/', '.');
    return pkg + kmClassName.substring(slash + 1).replace('.', '$');
  }

  static Map<Integer, String> typeParams(List<KmTypeParameter> own, Map<Integer, String> outer) {
    Map<Integer, String> m = new HashMap<>(outer);
    for (KmTypeParameter p : own) m.put(p.getId(), p.getName());
    return m;
  }

  static String typeParamList(List<KmTypeParameter> ps) {
    if (ps.isEmpty()) return "";
    List<String> out = new ArrayList<>();
    for (KmTypeParameter p : ps) {
      String v = p.getVariance() == KmVariance.IN ? "in " : p.getVariance() == KmVariance.OUT ? "out " : "";
      String b = "";
      if (!p.getUpperBounds().isEmpty() && !"Any?".equals(type(p.getUpperBounds().get(0), Map.of()))) {
        b = " : " + type(p.getUpperBounds().get(0), Map.of());
      }
      out.add(v + p.getName() + b);
    }
    return "<" + String.join(", ", out) + ">";
  }

  static String params(List<KmValueParameter> ps, Map<Integer, String> tp) {
    List<String> out = new ArrayList<>();
    for (KmValueParameter p : ps) {
      String t = p.getVarargElementType() != null
          ? "vararg " + p.getName() + ": " + type(p.getVarargElementType(), tp)
          : p.getName() + ": " + type(p.getType(), tp);
      // The metadata says a parameter HAS a default; the value lives in the
      // bytecode of the `$default` bridge and is not recoverable as source.
      if (Attributes.getDeclaresDefaultValue(p)) t += " = …";
      out.add(t);
    }
    return "(" + String.join(", ", out) + ")";
  }

  static String vis(Visibility v) { return v.name().toLowerCase(); }

  static String functionSignature(KmFunction f, Map<Integer, String> outerTp) {
    Map<Integer, String> tp = typeParams(f.getTypeParameters(), outerTp);
    StringBuilder s = new StringBuilder();
    if (Attributes.isSuspend(f)) s.append("suspend ");
    if (Attributes.isOperator(f)) s.append("operator ");
    if (Attributes.isInfix(f)) s.append("infix ");
    if (Attributes.isInline(f)) s.append("inline ");
    s.append("fun ");
    String tps = typeParamList(f.getTypeParameters());
    if (!tps.isEmpty()) s.append(tps).append(' ');
    if (f.getReceiverParameterType() != null) s.append(type(f.getReceiverParameterType(), tp)).append('.');
    s.append(f.getName()).append(params(f.getValueParameters(), tp));
    String ret = type(f.getReturnType(), tp);
    if (!"Unit".equals(ret)) s.append(": ").append(ret);
    return s.toString();
  }

  static String propertySignature(KmProperty p, Map<Integer, String> outerTp) {
    Map<Integer, String> tp = typeParams(p.getTypeParameters(), outerTp);
    StringBuilder s = new StringBuilder();
    if (Attributes.isConst(p)) s.append("const ");
    s.append(Attributes.isVar(p) ? "var " : "val ");
    if (p.getReceiverParameterType() != null) s.append(type(p.getReceiverParameterType(), tp)).append('.');
    s.append(p.getName()).append(": ").append(type(p.getReturnType(), tp));
    return s.toString();
  }

  static String sig(JvmMethodSignature s) { return s == null ? null : s.getName() + s.getDescriptor(); }
  static String sig(JvmFieldSignature s) { return s == null ? null : "field " + s.getName() + s.getDescriptor(); }

  /* ------------------------------------------------------------------- JSON */

  // Hand-rolled: the output is small and a dependency for it would be a
  // fourth jar to pin and verify.
  static String q(String s) {
    if (s == null) return "null";
    StringBuilder b = new StringBuilder("\"");
    for (char c : s.toCharArray()) {
      switch (c) {
        case '"': b.append("\\\""); break;
        case '\\': b.append("\\\\"); break;
        case '\n': b.append("\\n"); break;
        case '\r': b.append("\\r"); break;
        case '\t': b.append("\\t"); break;
        default:
          if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
      }
    }
    return b.append('"').toString();
  }

  static String json(Object o, String ind) {
    if (o == null) return "null";
    if (o instanceof String) return q((String) o);
    if (o instanceof Boolean || o instanceof Number) return o.toString();
    if (o instanceof Map) {
      @SuppressWarnings("unchecked") Map<String, Object> m = (Map<String, Object>) o;
      if (m.isEmpty()) return "{}";
      StringBuilder b = new StringBuilder("{\n");
      int i = 0;
      for (Map.Entry<String, Object> e : m.entrySet()) {
        b.append(ind).append("  ").append(q(e.getKey())).append(": ").append(json(e.getValue(), ind + "  "));
        if (++i < m.size()) b.append(',');
        b.append('\n');
      }
      return b.append(ind).append('}').toString();
    }
    if (o instanceof List) {
      List<?> l = (List<?>) o;
      if (l.isEmpty()) return "[]";
      boolean scalars = l.stream().allMatch(x -> x == null || x instanceof String || x instanceof Number || x instanceof Boolean);
      StringBuilder b = new StringBuilder("[");
      b.append(scalars ? "" : "\n");
      for (int i = 0; i < l.size(); i++) {
        if (!scalars) b.append(ind).append("  ");
        b.append(json(l.get(i), ind + "  "));
        if (i + 1 < l.size()) b.append(scalars ? ", " : ",");
        if (!scalars) b.append('\n');
      }
      if (!scalars) b.append(ind);
      return b.append(']').toString();
    }
    return q(o.toString());
  }

  static Map<String, Object> obj() { return new LinkedHashMap<>(); }

  /* --------------------------------------------------------------- the join */

  static Map<String, RtClass> runtime = new TreeMap<>();
  static Map<String, KmClass> declaredClasses = new HashMap<>();
  static String moduleName;

  static RtMember callable(RtClass rc, String key) {
    if (rc == null || key == null) return null;
    RtMember m = rc.byKey.get(key);
    return m != null && isPublic(m.access) ? m : null;
  }

  static RtClass outerOf(RtClass rc) {
    return rc.name.contains("$") ? runtime.get(rc.name.substring(0, rc.name.lastIndexOf('$'))) : null;
  }

  static Object constantOf(RtClass rc, RtClass outer, String fieldKey) {
    RtMember m = callable(rc, fieldKey);
    if (m == null) m = callable(outer, fieldKey);
    return m == null ? null : m.constant;
  }

  static void deprecated(Map<String, Object> row, RtMember m) {
    if (m != null && m.deprecated != null) row.put("deprecated", m.deprecated);
  }

  /** A declared public function and whether the runtime has it. */
  static Map<String, Object> function(KmFunction f, Map<Integer, String> tp, RtClass rc, Set<String> claimed) {
    Map<String, Object> fn = obj();
    fn.put("name", f.getName());
    fn.put("signature", functionSignature(f, tp));
    fn.put("suspend", Attributes.isSuspend(f));
    String s = sig(JvmExtensionsKt.getSignature(f));
    fn.put("jvm", s);
    RtMember m = callable(rc, s);
    fn.put("loadable", m != null);
    deprecated(fn, m);
    if (s != null) claimed.add(s);
    return fn;
  }

  /** A declared public property and whether the runtime has it. */
  static Map<String, Object> property(KmProperty p, Map<Integer, String> tp, RtClass rc, RtClass outer, Set<String> claimed) {
    Map<String, Object> pr = obj();
    pr.put("name", p.getName());
    pr.put("signature", propertySignature(p, tp));
    pr.put("mutable", Attributes.isVar(p));
    String g = sig(JvmExtensionsKt.getGetterSignature(p));
    String s = sig(JvmExtensionsKt.getSetterSignature(p));
    String f = sig(JvmExtensionsKt.getFieldSignature(p));
    pr.put("jvm_getter", g);
    pr.put("jvm_setter", s);
    pr.put("jvm_field", f);
    RtMember getter = callable(rc, g);
    boolean loadable = getter != null || callable(rc, f) != null || callable(outer, f) != null;
    pr.put("loadable", loadable);
    if (Attributes.isConst(p)) {
      Object c = constantOf(rc, outer, f);
      pr.put("value", c instanceof String || c instanceof Number || c instanceof Boolean ? c : c == null ? null : c.toString());
    }
    // Kotlin puts a property's annotations on a synthetic `get<Name>$annotations`
    // holder, so a deprecated property is read from there.
    RtMember holder = rc == null ? null : rc.byKey.get(
        "get" + Character.toUpperCase(p.getName().charAt(0)) + p.getName().substring(1) + "$annotations()V");
    deprecated(pr, holder);
    if (!pr.containsKey("deprecated")) deprecated(pr, getter);
    for (String k : new String[]{g, s, f}) if (k != null) claimed.add(k);
    return pr;
  }

  /** Every public runtime member no declared public member claimed, classified. */
  static List<Object> undeclared(RtClass rc, KmClass kc, Set<String> claimed, Map<String, String> nonPublic,
                                 Map<String, String> companionFns, Set<String> declaredNames) {
    List<Object> out = new ArrayList<>();
    boolean isEnum = kc != null && Attributes.getKind(kc) == ClassKind.ENUM_CLASS;
    String companion = kc == null ? null : kc.getCompanionObject();
    for (RtMember m : rc.members) {
      if (!isPublic(m.access) || claimed.contains(m.key()) || "<clinit>".equals(m.name)) continue;
      Map<String, Object> u = obj();
      u.put("name", m.name);
      u.put("jvm", m.key());
      u.put("access", flags(m.access, false));
      if (m.constant != null) u.put("constant", m.constant instanceof String || m.constant instanceof Number || m.constant instanceof Boolean ? m.constant : m.constant.toString());
      deprecated(u, m);
      String base = m.name.contains("$") ? m.name.substring(0, m.name.indexOf('$')) : m.name;
      String kind;
      if (nonPublic.containsKey(m.key())) kind = nonPublic.get(m.key());
      else if (moduleName != null && m.name.contains("$" + mangle(moduleName))) kind = "internal";
      else if (m.isField && ("INSTANCE".equals(m.name) || (companion != null && companion.equals(m.name)))) kind = "object-instance";
      else if (m.isField && isEnum && m.descriptor.equals("L" + rc.name.replace('.', '/') + ";")) kind = "enum-entry";
      else if (m.name.endsWith("$default")) kind = "default-argument-bridge";
      else if ("<init>".equals(m.name) && m.descriptor.contains("Lkotlin/jvm/internal/DefaultConstructorMarker;")) kind = "default-argument-bridge";
      else if (m.name.startsWith("access$") || m.name.endsWith("$annotations") || isSynthetic(m.access)) kind = "synthetic";
      else if (isEnum && ("values".equals(m.name) || "valueOf".equals(m.name) || "getEntries".equals(m.name))) kind = "enum-static";
      else if (!m.isField && isStatic(m.access) && companionFns.containsKey(m.name)) kind = "jvm-static";
      else if (!m.isField && declaredNames.contains(base)) kind = "jvm-overload";
      else kind = "other";
      u.put("kind", kind);
      out.add(u);
    }
    return out;
  }

  /** The suffix Kotlin appends to an `internal` member's JVM name. */
  static String mangle(String module) {
    return module.replaceAll("[^A-Za-z0-9_]", "_");
  }

  static byte[] read(InputStream in) throws Exception {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    byte[] buf = new byte[65536];
    int n;
    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
    return out.toByteArray();
  }

  public static void main(String[] argv) throws Exception {
    if (argv.length != 1) {
      System.err.println("usage: android-api-extract.java <artifact>.aar");
      System.exit(2);
    }

    // ---- the AAR: manifest, native libraries, classes.jar ------------------
    Map<String, Object> facts = obj();
    List<String> abis = new ArrayList<>();
    List<String> natives = new ArrayList<>();
    byte[] classesJar = null;
    Map<String, String> aarMeta = new TreeMap<>();
    try (ZipFile zf = new ZipFile(argv[0])) {
      for (ZipEntry e : Collections.list(zf.entries())) {
        String n = e.getName();
        if (n.equals("classes.jar")) classesJar = read(zf.getInputStream(e));
        else if (n.startsWith("jni/") && n.endsWith(".so")) {
          String[] parts = n.split("/");
          if (parts.length == 3) { if (!abis.contains(parts[1])) abis.add(parts[1]); natives.add(parts[2]); }
        } else if (n.equals("AndroidManifest.xml")) {
          String xml = new String(read(zf.getInputStream(e)), StandardCharsets.UTF_8);
          Matcher pm = Pattern.compile("package=\"([^\"]+)\"").matcher(xml);
          facts.put("manifest_package", pm.find() ? pm.group(1) : null);
          List<String> perms = new ArrayList<>();
          Matcher um = Pattern.compile("<uses-permission[^>]*android:name=\"([^\"]+)\"").matcher(xml);
          while (um.find()) perms.add(um.group(1));
          Collections.sort(perms);
          facts.put("uses_permissions", perms);
          Matcher sdk = Pattern.compile("android:minSdkVersion=\"(\\d+)\"").matcher(xml);
          facts.put("min_sdk", sdk.find() ? Integer.parseInt(sdk.group(1)) : null);
        } else if (n.equals("META-INF/com/android/build/gradle/aar-metadata.properties")) {
          for (String line : new String(read(zf.getInputStream(e)), StandardCharsets.UTF_8).split("\n")) {
            int eq = line.indexOf('=');
            if (eq > 0 && !line.startsWith("#")) aarMeta.put(line.substring(0, eq).trim(), line.substring(eq + 1).trim());
          }
        }
      }
    }
    if (classesJar == null) {
      System.err.println("the AAR has no classes.jar");
      System.exit(2);
    }
    Collections.sort(abis);
    Collections.sort(natives);
    facts.put("abis", abis);
    facts.put("native_libraries", natives);
    facts.put("aar_metadata", new LinkedHashMap<String, Object>(aarMeta));

    // ---- classes.jar: every class file, every kotlin_module ---------------
    List<String> moduleFiles = new ArrayList<>();
    Map<String, List<String>> moduleFacades = new TreeMap<>();
    try (ZipInputStream zin = new ZipInputStream(new ByteArrayInputStream(classesJar))) {
      ZipEntry e;
      while ((e = zin.getNextEntry()) != null) {
        if (e.getName().endsWith(".class")) {
          RtClass rc = readClass(read(zin));
          runtime.put(rc.name, rc);
        } else if (e.getName().endsWith(".kotlin_module")) {
          moduleFiles.add(e.getName().substring(e.getName().lastIndexOf('/') + 1));
          KmModule km = KotlinModuleMetadata.read(read(zin)).getKmModule();
          for (Map.Entry<String, KmPackageParts> p : km.getPackageParts().entrySet()) {
            List<String> facades = new ArrayList<>();
            for (String f : p.getValue().getFileFacades()) facades.add(f.replace('/', '.'));
            Collections.sort(facades);
            moduleFacades.put(p.getKey(), facades);
          }
        }
      }
    }
    Collections.sort(moduleFiles);
    facts.put("kotlin_modules", moduleFiles);

    // ---- the declared side: parse every @Metadata ---------------------------
    Map<String, KmPackage> facades = new HashMap<>();
    String metadataVersion = null;
    int syntheticClasses = 0;
    List<String> unreadable = new ArrayList<>();
    for (RtClass rc : runtime.values()) {
      if (!rc.hasMetadata) continue;
      if (rc.mv != null && metadataVersion == null) metadataVersion = rc.mv[0] + "." + rc.mv[1] + "." + rc.mv[2];
      kotlin.Metadata md = JvmMetadataUtil.Metadata(rc.k, rc.mv, rc.d1, rc.d2, rc.xs, rc.pn, rc.xi);
      KotlinClassMetadata km;
      try {
        km = KotlinClassMetadata.readStrict(md);
      } catch (Exception ex) {
        unreadable.add(rc.name + ": " + ex.getClass().getSimpleName() + ": " + ex.getMessage());
        continue;
      }
      if (km instanceof KotlinClassMetadata.Class) {
        KmClass kc = ((KotlinClassMetadata.Class) km).getKmClass();
        declaredClasses.put(rc.name, kc);
        if (moduleName == null) moduleName = JvmExtensionsKt.getModuleName(kc);
      } else if (km instanceof KotlinClassMetadata.FileFacade) {
        facades.put(rc.name, ((KotlinClassMetadata.FileFacade) km).getKmPackage());
      } else if (km instanceof KotlinClassMetadata.MultiFileClassPart) {
        facades.put(rc.name, ((KotlinClassMetadata.MultiFileClassPart) km).getKmPackage());
      } else if (km instanceof KotlinClassMetadata.SyntheticClass) {
        syntheticClasses++;
      }
    }
    facts.put("kotlin_metadata_version", metadataVersion);

    // ---- packages: typealiases and top-level members from file facades -----
    List<Object> packages = new ArrayList<>();
    for (Map.Entry<String, List<String>> p : moduleFacades.entrySet()) {
      Map<String, Object> pkg = obj();
      pkg.put("name", p.getKey());
      pkg.put("facades", p.getValue());
      List<Object> aliases = new ArrayList<>();
      List<Object> functions = new ArrayList<>();
      List<Object> properties = new ArrayList<>();
      List<Object> undeclared = new ArrayList<>();
      List<String> facadesWithoutMetadata = new ArrayList<>();
      for (String facade : p.getValue()) {
        KmPackage kp = facades.get(facade);
        RtClass rc = runtime.get(facade);
        if (kp == null) { facadesWithoutMetadata.add(facade); continue; }
        Set<String> claimed = new HashSet<>();
        Map<String, String> nonPublic = new HashMap<>();
        Set<String> names = new HashSet<>();
        for (KmTypeAlias a : kp.getTypeAliases()) {
          Map<String, Object> al = obj();
          al.put("name", a.getName());
          al.put("visibility", vis(Attributes.getVisibility(a)));
          String target = null;
          if (a.getExpandedType().getClassifier() instanceof KmClassifier.Class) {
            target = jvmName(((KmClassifier.Class) a.getExpandedType().getClassifier()).getName());
          }
          al.put("target", target);
          al.put("target_declared_public", target != null && declaredClasses.containsKey(target)
              && Attributes.getVisibility(declaredClasses.get(target)) == Visibility.PUBLIC);
          al.put("target_loadable", target != null && runtime.containsKey(target) && isPublic(runtime.get(target).access));
          aliases.add(al);
        }
        for (KmFunction f : kp.getFunctions()) {
          names.add(f.getName());
          if (Attributes.getVisibility(f) != Visibility.PUBLIC) {
            String s = sig(JvmExtensionsKt.getSignature(f));
            if (s != null) nonPublic.put(s, vis(Attributes.getVisibility(f)));
            continue;
          }
          functions.add(function(f, Map.of(), rc, claimed));
        }
        for (KmProperty pr : kp.getProperties()) {
          if (Attributes.getVisibility(pr) != Visibility.PUBLIC) {
            for (String s : new String[]{sig(JvmExtensionsKt.getGetterSignature(pr)), sig(JvmExtensionsKt.getSetterSignature(pr)), sig(JvmExtensionsKt.getFieldSignature(pr))}) {
              if (s != null) nonPublic.put(s, vis(Attributes.getVisibility(pr)));
            }
            continue;
          }
          properties.add(property(pr, Map.of(), rc, null, claimed));
        }
        if (rc != null) undeclared.addAll(undeclared(rc, null, claimed, nonPublic, Map.of(), names));
      }
      aliases.sort(Comparator.comparing(o -> (String) ((Map<?, ?>) o).get("name")));
      functions.sort(Comparator.comparing(o -> (String) ((Map<?, ?>) o).get("signature")));
      properties.sort(Comparator.comparing(o -> (String) ((Map<?, ?>) o).get("signature")));
      pkg.put("typealiases", aliases);
      pkg.put("functions", functions);
      pkg.put("properties", properties);
      pkg.put("loadable_undeclared", undeclared);
      pkg.put("facades_without_metadata", facadesWithoutMetadata);
      packages.add(pkg);
    }

    // ---- classes: the join ---------------------------------------------------
    List<Object> classes = new ArrayList<>();
    List<Object> internalClasses = new ArrayList<>();
    List<String> runtimeOnlyPublic = new ArrayList<>();
    // Per class: what the declaration claimed, what it marked non-public, and
    // what a companion's declaration claims on the OUTER class (a `const val`
    // or `@JvmField` lands as a static field there; `@JvmStatic` puts a static
    // copy there).
    Map<String, Set<String>> claimedBy = new HashMap<>();
    Map<String, Map<String, String>> nonPublicBy = new HashMap<>();
    Map<String, Map<String, String>> companionFnsBy = new HashMap<>();
    Map<String, Set<String>> declaredNamesBy = new HashMap<>();
    Map<String, Map<String, Object>> rows = new LinkedHashMap<>();

    for (Map.Entry<String, RtClass> e : runtime.entrySet()) {
      RtClass rc = e.getValue();
      KmClass kc = declaredClasses.get(rc.name);
      if (kc == null) {
        if (facades.containsKey(rc.name)) continue; // rendered under its package
        if (isPublic(rc.access) && !rc.hasMetadata) runtimeOnlyPublic.add(rc.name);
        continue;
      }
      Visibility v = Attributes.getVisibility(kc);
      if (v != Visibility.PUBLIC) {
        if (isPublic(rc.access)) {
          Map<String, Object> ic = obj();
          ic.put("name", rc.name);
          ic.put("declared_visibility", vis(v));
          ic.put("runtime_access", flags(rc.access, true));
          internalClasses.add(ic);
        }
        continue;
      }
      RtClass outer = outerOf(rc);
      Map<String, Object> cls = obj();
      cls.put("name", rc.name);
      cls.put("kind", Attributes.getKind(kc).name().toLowerCase().replace('_', '-'));
      cls.put("modality", Attributes.getModality(kc).name().toLowerCase());
      cls.put("is_data", Attributes.isData(kc));
      cls.put("is_fun_interface", Attributes.isFunInterface(kc));
      cls.put("runtime_access", flags(rc.access, true));
      cls.put("loadable", isPublic(rc.access));
      Map<Integer, String> tp = typeParams(kc.getTypeParameters(), Map.of());
      cls.put("type_parameters", typeParamList(kc.getTypeParameters()));
      List<String> supers = new ArrayList<>();
      for (KmType st : kc.getSupertypes()) {
        String s = type(st, tp);
        if (!"Any".equals(s)) supers.add(s);
      }
      cls.put("supertypes", supers);
      cls.put("companion", kc.getCompanionObject());
      List<String> nested = new ArrayList<>();
      for (String n : kc.getNestedClasses()) {
        KmClass nk = declaredClasses.get(rc.name + "$" + n);
        if (nk != null && Attributes.getVisibility(nk) == Visibility.PUBLIC) nested.add(n);
      }
      Collections.sort(nested);
      cls.put("nested_public", nested);
      List<String> entries = new ArrayList<>();
      for (KmEnumEntry en : kc.getKmEnumEntries()) entries.add(en.getName());
      cls.put("enum_entries", entries);
      List<String> sealed = new ArrayList<>();
      for (String s : kc.getSealedSubclasses()) sealed.add(simple(s));
      cls.put("sealed_subclasses", sealed);

      Set<String> claimed = new HashSet<>();
      Map<String, String> nonPublic = new HashMap<>();
      Set<String> names = new HashSet<>();

      List<Object> ctors = new ArrayList<>();
      for (KmConstructor c : kc.getConstructors()) {
        String s = sig(JvmExtensionsKt.getSignature(c));
        names.add("<init>");
        if (Attributes.getVisibility(c) != Visibility.PUBLIC) {
          if (s != null) nonPublic.put(s, vis(Attributes.getVisibility(c)));
          continue;
        }
        Map<String, Object> ct = obj();
        ct.put("signature", "constructor" + params(c.getValueParameters(), tp));
        ct.put("jvm", s);
        RtMember m = callable(rc, s);
        ct.put("loadable", m != null);
        deprecated(ct, m);
        if (s != null) claimed.add(s);
        ctors.add(ct);
      }
      ctors.sort(Comparator.comparing(o -> (String) ((Map<?, ?>) o).get("signature")));
      cls.put("constructors", ctors);

      List<Object> functions = new ArrayList<>();
      for (KmFunction f : kc.getFunctions()) {
        names.add(f.getName());
        if (Attributes.getVisibility(f) != Visibility.PUBLIC) {
          String s = sig(JvmExtensionsKt.getSignature(f));
          if (s != null) nonPublic.put(s, vis(Attributes.getVisibility(f)));
          continue;
        }
        functions.add(function(f, tp, rc, claimed));
      }
      functions.sort(Comparator.comparing(o -> (String) ((Map<?, ?>) o).get("signature")));
      cls.put("functions", functions);

      List<Object> properties = new ArrayList<>();
      Set<String> onOuter = new HashSet<>();
      for (KmProperty pr : kc.getProperties()) {
        names.add(pr.getName());
        String fs = sig(JvmExtensionsKt.getFieldSignature(pr));
        if (Attributes.getVisibility(pr) != Visibility.PUBLIC) {
          for (String s : new String[]{sig(JvmExtensionsKt.getGetterSignature(pr)), sig(JvmExtensionsKt.getSetterSignature(pr)), fs}) {
            if (s != null) nonPublic.put(s, vis(Attributes.getVisibility(pr)));
          }
          continue;
        }
        properties.add(property(pr, tp, rc, outer, claimed));
        if (fs != null) onOuter.add(fs);
      }
      properties.sort(Comparator.comparing(o -> (String) ((Map<?, ?>) o).get("signature")));
      cls.put("properties", properties);

      if (outer != null && Attributes.getKind(kc) == ClassKind.COMPANION_OBJECT) {
        claimedBy.computeIfAbsent(outer.name, k -> new HashSet<>()).addAll(onOuter);
        Map<String, String> fns = companionFnsBy.computeIfAbsent(outer.name, k -> new HashMap<>());
        for (KmFunction f : kc.getFunctions()) fns.put(f.getName(), sig(JvmExtensionsKt.getSignature(f)));
        // A companion's non-public FIELDS land on the outer class too. Its
        // constructor does not, and merging it once made the outer class's
        // public no-arg constructor read as "declared private" because both
        // are `<init>()V`.
        Map<String, String> outerNonPublic = nonPublicBy.computeIfAbsent(outer.name, k -> new HashMap<>());
        for (Map.Entry<String, String> np : nonPublic.entrySet()) {
          if (np.getKey().startsWith("field ")) outerNonPublic.put(np.getKey(), np.getValue());
        }
      }
      claimedBy.computeIfAbsent(rc.name, k -> new HashSet<>()).addAll(claimed);
      nonPublicBy.computeIfAbsent(rc.name, k -> new HashMap<>()).putAll(nonPublic);
      declaredNamesBy.put(rc.name, names);
      rows.put(rc.name, cls);
      classes.add(cls);
    }

    // ---- second pass: what the runtime has that the declaration does not ----
    for (Map.Entry<String, Map<String, Object>> e : rows.entrySet()) {
      RtClass rc = runtime.get(e.getKey());
      KmClass kc = declaredClasses.get(e.getKey());
      e.getValue().put("loadable_undeclared", undeclared(
          rc, kc, claimedBy.getOrDefault(rc.name, Set.of()), nonPublicBy.getOrDefault(rc.name, Map.of()),
          companionFnsBy.getOrDefault(rc.name, Map.of()), declaredNamesBy.getOrDefault(rc.name, Set.of())));
    }

    // ---- assemble ---------------------------------------------------------------
    Map<String, Object> out = obj();
    out.put("artifact_facts", facts);
    out.put("module_name", moduleName);
    out.put("packages", packages);
    out.put("classes", classes);
    Map<String, Object> dis = obj();
    dis.put("internal_classes", internalClasses);
    Collections.sort(runtimeOnlyPublic);
    dis.put("public_classes_without_metadata", runtimeOnlyPublic);
    dis.put("synthetic_classes", syntheticClasses);
    dis.put("unreadable_metadata", unreadable);
    out.put("disagreements", dis);
    Map<String, Object> counts = obj();
    counts.put("class_files", runtime.size());
    counts.put("declared_classes", declaredClasses.size());
    counts.put("public_classes", classes.size());
    out.put("counts", counts);
    System.out.println(json(out, ""));
  }
}
