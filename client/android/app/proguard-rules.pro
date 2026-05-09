# ════════════════════════════════════════════════════════════════
# 1:1연애 앱 ProGuard 규칙 (R8 minify + shrinkResources)
# ════════════════════════════════════════════════════════════════

# 라인 번호 보존 (Crashlytics 등 stack trace 추적용)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# WebView + JS interface 보존 (Capacitor 핵심)
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { *; }

# MainActivity 의 카카오 OAuth 딥링크 처리
-keep class com.love.onetoone.MainActivity { *; }

# Capacitor JavaScript bridge 어노테이션 보존
-keepclasseswithmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}

# JSON 직렬화 (만일 사용 시)
-keepclassmembers class * {
    @com.fasterxml.jackson.annotation.JsonProperty <fields>;
}

# AndroidX 기본
-keep class androidx.appcompat.** { *; }
-dontwarn androidx.**

# Kotlin (Capacitor 의존)
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
