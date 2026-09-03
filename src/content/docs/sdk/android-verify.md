---
title: "Verifying the Android SDK"
description: "The scripts behind the Android SDK page, their real output and their negative controls — run them yourself and compare."
section: sdk
group: "Languages"
order: 12.5
---

Every snippet on the [Android SDK page](/sdk/android) was executed exactly as
written before it was published, on a clean machine whose only path to the SDK was
its Maven coordinates. This page carries those scripts, the output they actually
produced, and — for each one — a **deliberately broken variant**, so you can tell a
working setup from a silently-failing one.

> ### What was and was not verified
>
> **Verified here:** that the coordinates resolve anonymously from Maven Central,
> that Kotlin written against the published API compiles against the AAR's
> `classes.jar`, and that the release APK packages the engine's native libraries.
>
> **NOT verified here:** anything that requires a phone. **No code on this page or
> on the Android SDK page was executed on an Android device.** The frame rates,
> parity figures and memory numbers quoted on that page come from internal
> measurements on named handsets and were **not** re-taken for this page.

**The environment these ran in:** Ubuntu x86_64, OpenJDK **17.0.20**, Gradle
**8.13**, Android SDK platform **35** + build-tools **35.0.0**, Android Gradle
Plugin **8.7.3**, Kotlin **2.0.21**. Exit codes below are read directly; a `rc=1`
shown for a control is the real one.

---

## Is it on Maven Central?

This one needs no Android SDK, no Gradle and no credentials — just `curl`. It has
its own positive and negative controls built in: `sdk` is known to exist,
`zzz-no-such-artifact` is known not to. If both answered the same, the probe would
be proving nothing.

```bash
#!/usr/bin/env bash
# central_check.sh — is a bitHuman Android coordinate on Maven Central, anonymously?
# No Android SDK, no Gradle, no credentials. Just curl.
set -uo pipefail
base=https://repo1.maven.org/maven2/ai/bithuman
probe() {
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 30 "$base/$1/maven-metadata.xml")
  printf '%-24s %s\n' "$1" "$code"
}
echo "-- artifacts under ai.bithuman"
curl -sS --max-time 30 "$base/" | grep -oE 'href="[a-z0-9-]+/"' | sed 's/href="/  /; s|/"||'
echo
echo "-- maven-metadata.xml, anonymous GET (200 = published, 404 = not published)"
probe expression2-android      # expression-2, published 2026-09-02
probe sdk                      # essence-1, published since May
probe essence2-android         # essence-2, published 2026-09-03
probe zzz-no-such-artifact     # negative control: must be 404
echo
echo "-- released versions"
for a in expression2-android essence2-android sdk; do
  printf '%-24s %s\n' "$a" \
    "$(curl -sS --max-time 30 "$base/$a/maven-metadata.xml" | grep -oPm1 '(?<=<release>)[^<]+')"
done
```

Real output, `rc=0`:

```text
-- artifacts under ai.bithuman
  essence2-android
  expression2-android
  sdk

-- maven-metadata.xml, anonymous GET (200 = published, 404 = not published)
expression2-android      200
sdk                      200
essence2-android         200
zzz-no-such-artifact     404

-- released versions
expression2-android      0.3.0
essence2-android         0.2.0
sdk                      2.3.6
```

★ **Read the controls, not just the answers.** `zzz-no-such-artifact` → 404 and
`sdk` → 200 means this probe *discriminates*, so `essence2-android` → **200** is a
real finding: essence-2 is genuinely published, rather than the registry answering
200 for everything. A registry that answered 401 or 404 for everything would tell
you nothing, and this estate has been misled by exactly that before.

> **Re-measured 2026-09-03.** This transcript previously showed
> `essence2-android 404` and read that as "genuinely not published". That was
> correct until the artifact was published at 03:39:15 UTC on 2026-09-03. The
> script is unchanged; only the answer moved. ★If you are looking for a
> permanently-absent coordinate to use as your own negative control, use
> `libelevate-android` — it was never published and still returns 404 (verified
> 2026-09-03) — not `essence2-android`, which now returns 200.

---

## Does an outside project resolve and compile against expression-2?

The project this builds has **no path to the SDK except its Maven coordinates** —
no `includeBuild`, no `project()`, no `flatDir`, no local AAR. If the publication
were broken, it could not silently succeed by reaching around it into a source
tree.

```bash
#!/usr/bin/env bash
# expr2_consumer_probe.sh — prove ai.bithuman:expression2-android:0.3.0 resolves,
# compiles and links for an OUTSIDE consumer.
#
# The project this builds has NO path to the SDK except its Maven coordinates:
# no includeBuild, no project(), no flatDir, no local AAR. If the publication is
# broken, this build cannot silently succeed by reaching around it.
#
# Needs: JDK 17, Gradle 8.x, an Android SDK in $ANDROID_HOME, network.
# Writes to a throwaway directory and deletes nothing you own.
set -uo pipefail

GROUP=ai.bithuman
ARTIFACT=expression2-android
VERSION=${1:-0.3.0}
WORK=$(mktemp -d "${TMPDIR:-/tmp}/expr2-consumer-XXXXXX")
GRADLE=${GRADLE_BIN:-gradle}

echo "== probe $GROUP:$ARTIFACT:$VERSION in $WORK"
[ -n "${ANDROID_HOME:-}" ] || { echo "SKIP: set ANDROID_HOME to an Android SDK"; exit 2; }

mkdir -p "$WORK/app/src/main/kotlin/ai/bithuman/probe"

# PROBE_OMIT_GOOGLE=1 drops google() from the DEPENDENCY repositories — the
# negative control for "mavenCentral() is enough". It is not: the AAR's own
# dependency com.google.ai.edge.litert:litert:2.2.0 is not on Central.
GOOGLE_LINE='        google()         // AGP, androidx, and com.google.ai.edge.litert:litert'
[ "${PROBE_OMIT_GOOGLE:-0}" = 1 ] && GOOGLE_LINE='        // google() OMITTED — negative control'

cat > "$WORK/settings.gradle.kts" <<EOF
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()   // the SDK itself
$GOOGLE_LINE
    }
}
rootProject.name = "expr2-consumer-probe"
include(":app")
EOF

cat > "$WORK/build.gradle.kts" <<'EOF'
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
EOF

cat > "$WORK/gradle.properties" <<'EOF'
android.useAndroidX=true
org.gradle.jvmargs=-Xmx2g
EOF

# PROBE_QNN=1 adds the Qualcomm delegate the accelerated path needs. It is NOT
# in the AAR: without these two artifacts Accelerator.NPU throws at runtime.
QNN_DEPS=""
[ "${PROBE_QNN:-0}" = 1 ] && QNN_DEPS='    implementation("com.qualcomm.qti:qnn-litert-delegate:2.49.0")
    implementation("com.qualcomm.qti:qnn-runtime:2.49.0")'

cat > "$WORK/app/build.gradle.kts" <<EOF
plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "ai.bithuman.probe"
    compileSdk = 35
    defaultConfig {
        applicationId = "ai.bithuman.probe"
        minSdk = 26          // the AAR's own minSdk; below it AGP fails the build
        targetSdk = 35
        ndk { abiFilters += "arm64-v8a" }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    packaging { jniLibs { useLegacyPackaging = true } }
}
dependencies {
    // THE LINE UNDER TEST — coordinates only.
    implementation("$GROUP:$ARTIFACT:$VERSION")
$QNN_DEPS
}
tasks.register("printResolvedSdk") {
    val cfg = configurations.named("releaseRuntimeClasspath")
    doLast {
        cfg.get().incoming.resolutionResult.allComponents
            .map { it.id.displayName }
            .filter { !it.startsWith("project ") }
            .sorted().forEach { println("RESOLVED \$it") }
    }
}
EOF

cat > "$WORK/app/src/main/AndroidManifest.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android"/>
EOF

# Real API use, so this is a COMPILE test and not just a download test.
cat > "$WORK/app/src/main/kotlin/ai/bithuman/probe/Probe.kt" <<'EOF'
package ai.bithuman.probe

import android.content.Context
import ai.bithuman.expression2.Accelerator
import ai.bithuman.expression2.Expression2Avatar
import ai.bithuman.expression2.Expression2Model
import ai.bithuman.expression2.Expression2Options
import ai.bithuman.expression2.Routing
import java.io.File

object Probe {
    fun describe(): String =
        "${Expression2Avatar.FRAME_WIDTH}x${Expression2Avatar.FRAME_HEIGHT} @ " +
        "${Expression2Avatar.FRAMES_PER_SECOND} fps, audio ${Expression2Avatar.SAMPLE_RATE} Hz"

    fun open(ctx: Context, dir: File): Expression2Avatar {
        val model = Expression2Model.combined(
            File(dir, "combined_fp32.tflite"),   // legacy member filenames, kept
            File(dir, "canon.bin"),              // for compatibility — see docs
        )
        return Expression2Avatar.create(
            ctx, model,
            Expression2Options(
                accelerator = Accelerator.NPU,
                routing = Routing.HTP_DECODER,
                qnnOptions = Expression2Options.QNN_OPTIONS_HEXAGON_BURST,
            ),
        )
    }
}
EOF

cd "$WORK" || exit 1
RC=0

echo "== R1 resolve"
"$GRADLE" -q --console=plain :app:printResolvedSdk > r1.log 2>&1
echo "   gradle rc=$?"
grep '^RESOLVED' r1.log | sed 's/^/   /'
if grep -qx "RESOLVED $GROUP:$ARTIFACT:$VERSION" r1.log; then
  echo "   OK   R1 resolved $GROUP:$ARTIFACT:$VERSION"
else
  echo "   FAIL R1 did not resolve"; tail -20 r1.log | sed 's/^/   /'; RC=1
fi

echo "== R2 compile + link"
"$GRADLE" --console=plain :app:assembleRelease > r2.log 2>&1
R2RC=$?
echo "   gradle rc=$R2RC"
APK=app/build/outputs/apk/release/app-release-unsigned.apk
if [ "$R2RC" = 0 ] && [ -f "$APK" ]; then
  echo "   OK   R2a compiled Kotlin against the AAR and packaged an APK"
  SOS="libexpr2jni.so libLiteRt.so"
  [ "${PROBE_QNN:-0}" = 1 ] && SOS="$SOS libQnnTFLiteDelegate.so libQnnGpu.so libQnnHtp.so"
  for so in $SOS; do
    if unzip -l "$APK" "lib/arm64-v8a/$so" >/dev/null 2>&1; then
      echo "   OK   R2b APK carries lib/arm64-v8a/$so"
    else
      echo "   FAIL R2b APK is missing lib/arm64-v8a/$so"; RC=1
    fi
  done
else
  echo "   FAIL R2 build failed"; grep -E '^e: |error:|What went wrong|> ' r2.log | head -10 | sed 's/^/   /'; RC=1
fi

echo "== verdict rc=$RC   (workdir $WORK)"
exit $RC
```

### The positive run

`rc=0`:

```text
== probe ai.bithuman:expression2-android:0.3.0 in /home/sgu/.docslane-android-0902/work/expr2-consumer-T2E2f4
== R1 resolve
   gradle rc=0
   RESOLVED ai.bithuman:expression2-android:0.3.0
   RESOLVED com.google.ai.edge.litert:litert:2.2.0
   RESOLVED org.jetbrains.kotlin:kotlin-stdlib:2.0.21
   RESOLVED org.jetbrains:annotations:13.0
   OK   R1 resolved ai.bithuman:expression2-android:0.3.0
== R2 compile + link
   gradle rc=0
   OK   R2a compiled Kotlin against the AAR and packaged an APK
   OK   R2b APK carries lib/arm64-v8a/libexpr2jni.so
   OK   R2b APK carries lib/arm64-v8a/libLiteRt.so
== verdict rc=0   (workdir /home/sgu/.docslane-android-0902/work/expr2-consumer-T2E2f4)
```

That is the whole claim: an outside project resolved
`ai.bithuman:expression2-android:0.3.0` from Maven Central, compiled Kotlin that
calls `Expression2Avatar.create`, `Expression2Model.combined` and
`Expression2Options` against the published `classes.jar`, and packaged both engine
libraries into an APK.

### Control 1: a version that is not on Central

`0.2.0` is a real version — it exists, privately, in a registry you cannot reach.
Publicly it does not, and that must fail. `rc=1`:

```text
== probe ai.bithuman:expression2-android:0.2.0 in /home/sgu/.docslane-android-0902/work/expr2-consumer-uAbRRM
== R1 resolve
   gradle rc=0
   RESOLVED org.jetbrains.kotlin:kotlin-stdlib:2.0.21
   RESOLVED org.jetbrains:annotations:13.0
   FAIL R1 did not resolve
   RESOLVED org.jetbrains.kotlin:kotlin-stdlib:2.0.21
   RESOLVED org.jetbrains:annotations:13.0
== R2 compile + link
   gradle rc=1
   FAIL R2 build failed
   > Task :app:buildKotlinToolingMetadata
   > Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
   > Task :app:preBuild UP-TO-DATE
   > Task :app:preReleaseBuild UP-TO-DATE
   > Task :app:checkReleaseAarMetadata FAILED
   * What went wrong:
   > Could not resolve all files for configuration ':app:releaseRuntimeClasspath'.
      > Could not find ai.bithuman:expression2-android:0.2.0.
   > Run with --stacktrace option to get the stack trace.
   > Run with --info or --debug option to get more log output.
== verdict rc=1   (workdir /home/sgu/.docslane-android-0902/work/expr2-consumer-uAbRRM)
```

★ **Look at what the resolve step did.** `gradle rc=0` — the `printResolvedSdk`
task **exited zero with the SDK missing from the graph**. Gradle's resolution
result simply omits what it could not resolve. A build that only checked the exit
code of a resolve task would have called this a success. That is why the script
asserts on the `RESOLVED` line and then compiles: **`BUILD SUCCESSFUL` does not
tell you which artifact you got.**

### Control 2: mavenCentral() alone is not enough

The most likely way for your build to break. `PROBE_OMIT_GOOGLE=1` drops
`google()` from the dependency repositories. `rc=1`:

```text
== probe ai.bithuman:expression2-android:0.3.0 in /home/sgu/.docslane-android-0902/work/expr2-consumer-0tToFz
== R1 resolve
   gradle rc=0
   RESOLVED ai.bithuman:expression2-android:0.3.0
   RESOLVED org.jetbrains.kotlin:kotlin-stdlib:2.0.21
   RESOLVED org.jetbrains:annotations:13.0
   OK   R1 resolved ai.bithuman:expression2-android:0.3.0
== R2 compile + link
   gradle rc=1
   FAIL R2 build failed
   > Task :app:buildKotlinToolingMetadata
   > Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
   > Task :app:preBuild UP-TO-DATE
   > Task :app:preReleaseBuild UP-TO-DATE
   > Task :app:checkReleaseAarMetadata FAILED
   * What went wrong:
   > Could not resolve all files for configuration ':app:releaseRuntimeClasspath'.
      > Could not find com.google.ai.edge.litert:litert:2.2.0.
            project :app > ai.bithuman:expression2-android:0.3.0
   > If the artifact you are trying to retrieve can be found in the repository but without metadata in 'Maven POM' format, you need to adjust the 'metadataSources { ... }' of the repository declaration.
== verdict rc=1   (workdir /home/sgu/.docslane-android-0902/work/expr2-consumer-0tToFz)
```

★ **This one is worse than control 1, and it is why `google()` is on the install
snippet.** R1 goes green — `OK R1 resolved ai.bithuman:expression2-android:0.3.0`,
`gradle rc=0` — because our AAR *is* on Central and does resolve. What is missing
is its dependency `com.google.ai.edge.litert:litert:2.2.0`, which is published only
to Google's Maven repository. The failure lands two steps later at
`checkReleaseAarMetadata`. **Asserting on the resolved coordinate is not sufficient
either; only the compile leg is.**

### The accelerated-path install

`PROBE_QNN=1` adds the two Qualcomm artifacts the NPU path needs. `rc=0`:

```text
== probe ai.bithuman:expression2-android:0.3.0 in /home/sgu/.docslane-android-0902/work/expr2-consumer-3GSokx
== R1 resolve
   gradle rc=0
   RESOLVED ai.bithuman:expression2-android:0.3.0
   RESOLVED com.google.ai.edge.litert:litert:2.2.0
   RESOLVED com.qualcomm.qti:qnn-litert-delegate:2.49.0
   RESOLVED com.qualcomm.qti:qnn-runtime:2.49.0
   RESOLVED org.jetbrains.kotlin:kotlin-stdlib:2.0.21
   RESOLVED org.jetbrains:annotations:13.0
   OK   R1 resolved ai.bithuman:expression2-android:0.3.0
== R2 compile + link
   gradle rc=0
   OK   R2a compiled Kotlin against the AAR and packaged an APK
   OK   R2b APK carries lib/arm64-v8a/libexpr2jni.so
   OK   R2b APK carries lib/arm64-v8a/libLiteRt.so
   OK   R2b APK carries lib/arm64-v8a/libQnnTFLiteDelegate.so
   OK   R2b APK carries lib/arm64-v8a/libQnnGpu.so
   OK   R2b APK carries lib/arm64-v8a/libQnnHtp.so
== verdict rc=0   (workdir /home/sgu/.docslane-android-0902/work/expr2-consumer-3GSokx)
```

The APK grew from **4,539,502 B** to **71,866,299 B** between this run and the
positive run above — same SDK, plus the QNN runtime. `libQnnGpu.so` is in there
because `backend_type:gpu` loads it; excluding it breaks the Adreno routing.

---

## Does an outside project resolve and compile against essence-1?

Same shape, for `ai.bithuman:sdk:2.3.6` — the artifact that has been on Maven
Central since May 2026 and that this documentation had never mentioned until today.

```bash
#!/usr/bin/env bash
# essence1_consumer_probe.sh — prove ai.bithuman:sdk:2.3.6 (essence-1) resolves and
# compiles for an outside consumer. Same shape as the expression-2 probe: the
# project's ONLY path to the SDK is its Maven coordinates.
#
# Needs: JDK 17, Gradle 8.x, an Android SDK in $ANDROID_HOME, network.
# PROBE_WRONG_PCM=1 compiles ShortArray into pushAudio instead of FloatArray —
# the negative control, and the mistake the old docs page shipped.
set -uo pipefail

COORD=${1:-ai.bithuman:sdk:2.3.6}
WORK=$(mktemp -d "${TMPDIR:-/tmp}/essence1-consumer-XXXXXX")
GRADLE=${GRADLE_BIN:-gradle}
echo "== probe $COORD in $WORK"
[ -n "${ANDROID_HOME:-}" ] || { echo "SKIP: set ANDROID_HOME to an Android SDK"; exit 2; }

mkdir -p "$WORK/app/src/main/kotlin/ai/bithuman/probe"
cat > "$WORK/settings.gradle.kts" <<'EOF'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { mavenCentral(); google() }
}
rootProject.name = "essence1-consumer-probe"
include(":app")
EOF
cat > "$WORK/build.gradle.kts" <<'EOF'
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
EOF
printf 'android.useAndroidX=true\norg.gradle.jvmargs=-Xmx2g\n' > "$WORK/gradle.properties"
cat > "$WORK/app/build.gradle.kts" <<EOF
plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "ai.bithuman.probe"
    compileSdk = 35
    defaultConfig {
        applicationId = "ai.bithuman.probe"
        minSdk = 29                      // essence-1's own minSdk
        ndk { abiFilters += "arm64-v8a" }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    packaging { jniLibs { useLegacyPackaging = true } }
}
dependencies { implementation("$COORD") }
tasks.register("printResolvedSdk") {
    val cfg = configurations.named("releaseRuntimeClasspath")
    doLast {
        cfg.get().incoming.resolutionResult.allComponents
            .map { it.id.displayName }.filter { !it.startsWith("project ") }
            .sorted().forEach { println("RESOLVED \$it") }
    }
}
EOF
printf '<manifest xmlns:android="http://schemas.android.com/apk/res/android"/>\n' \
  > "$WORK/app/src/main/AndroidManifest.xml"

PCM_TYPE=FloatArray
[ "${PROBE_WRONG_PCM:-0}" = 1 ] && PCM_TYPE=ShortArray
cat > "$WORK/app/src/main/kotlin/ai/bithuman/probe/Probe.kt" <<EOF
package ai.bithuman.probe

import ai.bithuman.sdk.Avatar
import ai.bithuman.sdk.Fixture
import ai.bithuman.sdk.Runtime

object Probe {
    fun oneShot(modelPath: String, apiSecret: String) =
        Avatar.load(modelPath, apiSecret).use { avatar ->
            avatar.composeFromFile("/sdcard/speech.wav").count()
        }

    fun stream(modelPath: String, pcm: $PCM_TYPE) {
        Fixture(modelPath).use { fx ->
            val rt = Runtime(fx)
            val info = fx.info
            val frame = ByteArray(info.frameWidth * info.frameHeight * 3)
            rt.pushAudio(pcm)                     // FloatArray, 16 kHz mono
            while (rt.ticksAvailable > 0) rt.pullFrame(frame, -1)
            rt.resetStream()
        }
    }
}
EOF

cd "$WORK" || exit 1
RC=0
echo "== R1 resolve"
"$GRADLE" -q --console=plain :app:printResolvedSdk > r1.log 2>&1
echo "   gradle rc=$?"
grep '^RESOLVED' r1.log | sed 's/^/   /'
grep -qx "RESOLVED $COORD" r1.log && echo "   OK   R1 resolved $COORD" \
  || { echo "   FAIL R1 did not resolve $COORD"; RC=1; }

echo "== R2 compile + link"
"$GRADLE" --console=plain :app:assembleRelease > r2.log 2>&1
R2RC=$?
echo "   gradle rc=$R2RC"
APK=app/build/outputs/apk/release/app-release-unsigned.apk
if [ "$R2RC" = 0 ] && [ -f "$APK" ]; then
  echo "   OK   R2a compiled Kotlin against the AAR and packaged an APK"
  for so in libessence_jni.so libonnxruntime.so libc++_shared.so; do
    unzip -l "$APK" "lib/arm64-v8a/$so" >/dev/null 2>&1 \
      && echo "   OK   R2b APK carries lib/arm64-v8a/$so" \
      || { echo "   FAIL R2b APK missing lib/arm64-v8a/$so"; RC=1; }
  done
else
  echo "   FAIL R2 build failed"; grep -E '^e: |error:' r2.log | head -6 | sed 's/^/   /'; RC=1
fi
echo "== verdict rc=$RC   (workdir $WORK)"
exit $RC
```

### The positive run

`rc=0`:

```text
== probe ai.bithuman:sdk:2.3.6 in /home/sgu/.docslane-android-0902/work/essence1-consumer-aDHMTh
== R1 resolve
   gradle rc=0
   RESOLVED ai.bithuman:sdk:2.3.6
   RESOLVED org.jetbrains.kotlin:kotlin-stdlib:2.0.21
   RESOLVED org.jetbrains:annotations:13.0
   OK   R1 resolved ai.bithuman:sdk:2.3.6
== R2 compile + link
   gradle rc=0
   OK   R2a compiled Kotlin against the AAR and packaged an APK
   OK   R2b APK carries lib/arm64-v8a/libessence_jni.so
   OK   R2b APK carries lib/arm64-v8a/libonnxruntime.so
   OK   R2b APK carries lib/arm64-v8a/libc++_shared.so
== verdict rc=0   (workdir /home/sgu/.docslane-android-0902/work/essence1-consumer-aDHMTh)
```

### Control 3: the old page's ShortArray

The Android SDK page used to show `fun onAudio(pcm: ShortArray)` feeding
`Runtime.pushAudio`. `PROBE_WRONG_PCM=1` compiles exactly that. `rc=1`:

```text
== probe ai.bithuman:sdk:2.3.6 in /home/sgu/.docslane-android-0902/work/essence1-consumer-etdbn3
== R1 resolve
   gradle rc=0
   RESOLVED ai.bithuman:sdk:2.3.6
   RESOLVED org.jetbrains.kotlin:kotlin-stdlib:2.0.21
   RESOLVED org.jetbrains:annotations:13.0
   OK   R1 resolved ai.bithuman:sdk:2.3.6
== R2 compile + link
   gradle rc=1
   FAIL R2 build failed
   e: file:///home/sgu/.docslane-android-0902/work/essence1-consumer-etdbn3/app/src/main/kotlin/ai/bithuman/probe/Probe.kt:18:26 Argument type mismatch: actual type is 'kotlin.ShortArray', but 'kotlin.FloatArray' was expected.
== verdict rc=1   (workdir /home/sgu/.docslane-android-0902/work/essence1-consumer-etdbn3)
```

★ **That snippet had been published and could never have compiled.**
`Runtime.pushAudio` takes a `FloatArray`. The corrected version is on the
[Android SDK page](/sdk/android#streaming), and this control is what keeps it
honest: the check goes red on the old text and green on the new one.

---

## Reproducing this

The three scripts above are complete and self-contained; copy them out of this page
and run them. They write to a throwaway directory, never touch a device, and delete
nothing you own. You need a JDK 17, Gradle 8.x, an Android SDK in `ANDROID_HOME`,
and network access to Maven Central and Google's Maven repository — the two probes
that need an Android SDK exit **2** with `SKIP` if `ANDROID_HOME` is unset rather
than pretending to pass.

If a run disagrees with the transcripts here, the transcripts are the ones that
should be doubted — they were taken on 2026-09-02 and a registry changes.

## See also

- [Android SDK](/sdk/android) — the coordinates, the limits and the API
- [SDK overview](/sdk) — which SDK to pick
