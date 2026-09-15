#!/usr/bin/env python3
"""Read the PUBLIC surface of the INSTALLED `bithuman` package and print it as JSON.

★THE GOVERNING RULE, and the reason this file exists at all:

    A SYMBOL ENTERS THE REFERENCE ONLY IF IT IS PUBLIC IN THE SHIPPED
    INTERFACE.  A symbol present in SOURCE, or present in a compiled artifact
    as a LOCAL symbol, is evidence of the OPPOSITE of presence — it is
    something a consumer cannot call.

The rule was paid for on the Apple surface: `pullPos()` exists in the shipped
`.a` as a local symbol and appears in no `.swiftinterface`, so a reference
generated from the source tree would have documented a method no developer can
call.  So this script NEVER reads a repository.  It is run by the interpreter of
a virtualenv into which one thing has been installed — `bithuman` at the version
PyPI serves — and everything it prints is read back out of those bytes.

WHAT COUNTS AS "THE SHIPPED INTERFACE" IN PYTHON.  Two authorities, in order:

  1. A TYPE STUB shipped beside the module (`__init__.pyi`, with `py.typed`).
     This is Python's `.swiftinterface`: the package itself declaring what it
     offers.  Where one exists it WINS, and the runtime is used only to confirm
     each name really resolves.  Measured on 3.1.8, this is what the rule buys:
     `Avatar.__init__(self, engine, engine_id, armed=True)` exists on the
     runtime class and appears in NO stub, and the class docstring says "Get one
     from bithuman.open" — a reference generated from the runtime object alone
     would have published a constructor taking two engine handles.
  2. Otherwise the runtime module: `__all__` where it exists, else a leading
     underscore means private.

BOTH DIRECTIONS ARE RECORDED, never silently dropped:
  `not_in_shipped_interface`  present on the runtime object, absent from the
                              stub — the `pullPos()` class.
  `stub_only`                 declared by the stub and NOT resolvable at
                              runtime.  Measured on 3.1.8: `Audio`, the audio
                              type alias — a type checker accepts it and
                              `from bithuman import Audio` raises ImportError.

Determinism: names keep the order the artifact declares them in (`__all__` order
is the package's own), modules are sorted, and nothing here depends on the
filesystem layout of a checkout.  Run by scripts/gen-python-api.mjs.

    python scripts/python-api-extract.py            # JSON on stdout
"""

from __future__ import annotations

import ast
import importlib
import inspect
import json
import os
import pkgutil
import sys

ROOT_PACKAGE = "bithuman"

# Dunder methods that ARE part of a public interface: a developer writes `with`
# and the interpreter calls them by name. Every other dunder is machinery.
PROTOCOL_DUNDERS = ("__enter__", "__exit__", "__iter__", "__next__", "__len__")


def first_paragraph(doc: str | None) -> str:
    if not doc:
        return ""
    out = []
    for line in doc.strip().splitlines():
        if not line.strip() and out:
            break
        out.append(line.strip())
    return " ".join(out)


def signature_of(obj) -> str | None:
    try:
        return str(inspect.signature(obj))
    except (TypeError, ValueError):
        return None


def kind_of(obj) -> str:
    if inspect.ismodule(obj):
        return "module"
    if inspect.isclass(obj):
        return "exception" if issubclass(obj, BaseException) else "class"
    if callable(obj):
        return "function"
    return "constant"


def exception_bases(cls) -> list[str]:
    return [b.__name__ for b in cls.__bases__]


def own_methods(cls) -> list[str]:
    """Methods DEFINED ON THIS CLASS (not inherited), public by the underscore
    rule, plus the protocol dunders."""
    out = []
    for name, member in inspect.getmembers(cls, predicate=inspect.isfunction):
        if name.startswith("_") and name not in PROTOCOL_DUNDERS:
            continue
        qual = getattr(member, "__qualname__", "")
        if qual.split(".")[0] != cls.__name__:
            continue
        out.append(name)
    return sorted(out)


def method_record(cls, name, declared_signature=None) -> dict:
    member = getattr(cls, name)
    runtime = signature_of(member)
    out = {
        "name": name,
        "signature": declared_signature or runtime,
        "doc": inspect.getdoc(member) or "",
    }
    if declared_signature and runtime != declared_signature:
        out["runtime_signature"] = runtime
    return out


# --------------------------------------------------------------------- stubs


def stub_path_for(module) -> str | None:
    """The `.pyi` the PACKAGE ships beside this module, if any."""
    f = getattr(module, "__file__", None)
    if not f:
        return None
    if f.endswith("__init__.py"):
        cand = f[: -len(".py")] + ".pyi"
    elif f.endswith(".py"):
        cand = f[: -len(".py")] + ".pyi"
    else:
        return None
    return cand if os.path.exists(cand) else None


def stub_signature(fn) -> str:
    """The signature a stub DECLARES, as the stub writes it — which is richer
    than the runtime object's. Measured on 3.1.8: the stub says
    `render(self, audio: Audio) -> Iterator[np.ndarray]` and the runtime object
    says `render(self, audio) -> "Iterator['object']"`. The stub is the shipped
    interface, so it is what the reference states."""
    for line in ast.unparse(fn).splitlines():
        if line.startswith("def ") or line.startswith("async def "):
            return line[line.index("(") :].rstrip(":").strip()
    return ""


def read_stub(path: str) -> dict:
    """What the shipped stub DECLARES: `__all__`, every top-level name, each
    class's own members, and the signature of each."""
    tree = ast.parse(open(path, encoding="utf-8").read(), filename=path)
    declared: list[str] = []
    classes: dict[str, dict[str, str]] = {}
    signatures: dict[str, str] = {}
    aliases: dict[str, str] = {}
    top: list[str] = []
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id == "__all__":
                    declared = [
                        e.value for e in node.value.elts if isinstance(e, ast.Constant)
                    ]
                elif isinstance(t, ast.Name):
                    top.append(t.id)
                    aliases[t.id] = ast.unparse(node.value)
        elif isinstance(node, ast.ClassDef):
            top.append(node.name)
            classes[node.name] = {
                b.name: stub_signature(b)
                for b in node.body
                if isinstance(b, (ast.FunctionDef, ast.AsyncFunctionDef))
            }
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            top.append(node.name)
            signatures[node.name] = stub_signature(node)
    return {
        "declared": declared,
        "classes": classes,
        "signatures": signatures,
        "aliases": aliases,
        "defined": top,
    }


# ------------------------------------------------------------------- modules


def public_module_names() -> list[str]:
    """Every importable module in the installed package whose every dotted
    segment is public by the underscore rule. Dunder modules (`__main__`) are
    entry points, not import targets, and are handled separately."""
    root = importlib.import_module(ROOT_PACKAGE)
    names = [ROOT_PACKAGE]
    for info in pkgutil.walk_packages(root.__path__, prefix=ROOT_PACKAGE + "."):
        segments = info.name.split(".")[1:]
        if any(s.startswith("_") for s in segments):
            continue
        names.append(info.name)
    return sorted(set(names))


def describe_module(name: str) -> dict:
    try:
        module = importlib.import_module(name)
    except Exception as exc:
        # ★A NAME THAT LOOKS LIKE A MODULE AND WILL NOT IMPORT. Measured on
        # 3.1.8: `bithuman/lib/*.so` are native shared libraries the engine
        # loads by path, and `pkgutil` lists them as modules because of the
        # suffix. `import bithuman.lib.libengine` raises. This is the Python
        # spelling of the defect the governing rule names: present in the
        # artifact, not callable by a consumer.
        return {
            "name": name,
            "interface": "not-importable",
            "import_error": f"{type(exc).__name__}: {exc}",
            "declared": [],
            "symbols": [],
        }

    stub = stub_path_for(module)
    stub_decl = read_stub(stub) if stub else None

    if stub_decl and stub_decl["declared"]:
        declared = list(stub_decl["declared"])
        interface = "stub"
    elif getattr(module, "__all__", None) is not None:
        declared = list(module.__all__)
        interface = "__all__"
    else:
        # ★A MODULE THAT DECLARES NOTHING HAS NOT DECLARED ANYTHING PUBLIC, and
        # the underscore rule cannot rescue it: over `dir()` it cannot tell an
        # intended export from an import. Measured on 3.1.8,
        # `bithuman.bindings.libengine` has no `__all__` and the underscore rule
        # returns `os`, `Optional` and `Sequence` — three names from the import
        # block — beside the ctypes handles. Publishing those would be the
        # source-tree mistake wearing a different hat, so an undeclared module
        # is RECORDED and left empty rather than guessed at.
        return {
            "name": name,
            "interface": "undeclared",
            "stub": None,
            "doc": inspect.getdoc(module) or "",
            "declared": [],
            "symbols": [],
            "stub_only": [],
            "runtime_extra": [],
        }

    symbols, stub_only = [], []
    for sym_name in declared:
        if not hasattr(module, sym_name):
            stub_only.append(sym_name)
            continue
        obj = getattr(module, sym_name)
        kind = kind_of(obj)
        # ★A CONSTANT HAS NO DOCSTRING, and asking for one gets the docstring of
        # its TYPE — which is CPython's, not this package's, and differs between
        # interpreters (3.12's `str` doc says "sys.getdefaultencoding()", 3.14's
        # says "'utf-8'"). Left in, the extraction would have differed by the
        # interpreter that ran it and the gate would have reported a surface
        # change on every runner upgrade. Found by extracting twice, on 3.12 and
        # on 3.14, and diffing — not by reading this code.
        doc = "" if kind == "constant" else (inspect.getdoc(obj) or "")
        record = {"name": sym_name, "kind": kind, "doc": doc}
        if kind in ("class", "exception"):
            record["bases"] = exception_bases(obj)
            record["defined_in"] = getattr(obj, "__module__", "")
            runtime_members = own_methods(obj)
            if stub_decl is not None:
                allowed = stub_decl["classes"].get(sym_name, {})
                members = [m for m in runtime_members if m in allowed]
                # `__init__` counts only when the class DEFINES one: an
                # inherited `Exception.__init__` is not this package's surface.
                candidates = set(runtime_members)
                if "__init__" in vars(obj):
                    candidates.add("__init__")
                record["not_in_shipped_interface"] = [
                    {"name": m, "signature": signature_of(getattr(obj, m))}
                    for m in sorted(candidates)
                    if m not in allowed
                ]
                record["constructor"] = allowed.get("__init__")
            else:
                members = runtime_members
                record["not_in_shipped_interface"] = []
                record["constructor"] = signature_of(obj)
            declared_sigs = (
                stub_decl["classes"].get(sym_name, {}) if stub_decl else {}
            )
            record["members"] = [
                method_record(obj, m, declared_sigs.get(m)) for m in members
            ]
        elif kind == "function":
            runtime = signature_of(obj)
            declared_sig = stub_decl["signatures"].get(sym_name) if stub_decl else None
            record["signature"] = declared_sig or runtime
            if declared_sig and runtime != declared_sig:
                record["runtime_signature"] = runtime
        elif kind == "module":
            record["value_type"] = "module"
        else:
            record["value_type"] = type(obj).__name__
            record["value"] = repr(obj) if not isinstance(obj, (bytes,)) else "<bytes>"
        symbols.append(record)

    # ★NAMES THE SHIPPED STUB DECLARES THAT DO NOT RESOLVE AT RUNTIME. Measured
    # on 3.1.8: `Audio`, the alias every `audio` parameter is annotated with. A
    # type checker accepts it and `from bithuman import Audio` raises
    # ImportError, so a reference built from the stub alone would have published
    # an import that fails. Recorded with the alias text, because a signature
    # that says `audio: Audio` means nothing without it.
    if stub_decl:
        for n in stub_decl["defined"]:
            if n.startswith("_") or hasattr(module, n) or n in stub_only:
                continue
            stub_only.append(n)

    # Names the RUNTIME module offers that the shipped interface does not.
    runtime_public = sorted(n for n in dir(module) if not n.startswith("_"))
    extra = [n for n in runtime_public if n not in declared]

    return {
        "name": name,
        "interface": interface,
        "stub": os.path.basename(stub) if stub else None,
        "doc": inspect.getdoc(module) or "",
        "declared": declared,
        "symbols": symbols,
        "stub_only": stub_only,
        "stub_aliases": {
            n: stub_decl["aliases"][n]
            for n in stub_only
            if stub_decl and n in stub_decl["aliases"]
        },
        "runtime_extra": extra,
    }


def distribution_facts() -> dict:
    from importlib import metadata

    dist = metadata.distribution(ROOT_PACKAGE)
    md = dist.metadata
    return {
        "name": md["Name"],
        "version": md["Version"],
        "requires_python": md["Requires-Python"],
        "extras": sorted(md.get_all("Provides-Extra") or []),
        "console_scripts": sorted(
            ep.name for ep in dist.entry_points if ep.group == "console_scripts"
        ),
        "has_py_typed": os.path.exists(
            os.path.join(
                os.path.dirname(importlib.import_module(ROOT_PACKAGE).__file__),
                "py.typed",
            )
        ),
    }


def retired_names() -> list[str]:
    """Names the package intercepts with a REFUSAL rather than an
    AttributeError. They are NOT public — nothing exports them — so they never
    enter the symbol tables; what is recorded is that the refusal exists and
    which names it covers, which is shipped BEHAVIOUR a reader meets."""
    module = importlib.import_module(ROOT_PACKAGE)
    out = []
    for name in sorted(getattr(module, "_RETIRED", {})):
        try:
            getattr(module, name)
        except Exception as exc:
            out.append(
                {
                    "name": name,
                    "raises": type(exc).__name__,
                    "is_import_error": isinstance(exc, ImportError),
                }
            )
    return out


def main() -> int:
    modules = [describe_module(n) for n in public_module_names()]
    root = importlib.import_module(ROOT_PACKAGE)
    out = {
        "package": ROOT_PACKAGE,
        "distribution": distribution_facts(),
        "dunder_version": hasattr(root, "__version__"),
        "runnable_as_module": os.path.exists(
            os.path.join(os.path.dirname(root.__file__), "__main__.py")
        ),
        "retired": retired_names(),
        "modules": modules,
        "extracted_by": {
            "python": ".".join(str(x) for x in sys.version_info[:3]),
            "implementation": sys.implementation.name,
        },
    }
    json.dump(out, sys.stdout, indent=2, sort_keys=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
