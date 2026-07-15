package com.g2bridge.deezer

import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/** Shared OkHttp client for Deezer + lrclib calls. */
object Http {
    val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(8, TimeUnit.SECONDS)
        .build()
}
