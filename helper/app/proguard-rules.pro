# Keep kotlinx.serialization generated serializers
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class **$$serializer { *; }
-keepclasseswithmembers class kotlinx.serialization.json.** { <fields>; }
-keep,includedescriptorclasses class com.g2bridge.deezer.**$$serializer { *; }
-keepclassmembers class com.g2bridge.deezer.** {
    *** Companion;
}
