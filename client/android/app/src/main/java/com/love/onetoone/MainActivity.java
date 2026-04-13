package com.love.onetoone;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleDeepLink(intent);
    }

    private void handleDeepLink(Intent intent) {
        Uri data = intent.getData();
        if (data != null && "com.love.onetoone".equals(data.getScheme())) {
            String code = data.getQueryParameter("code");
            if (code != null) {
                String url = "https://localhost/auth/kakao/callback?code=" + Uri.encode(code);
                getBridge().getWebView().post(() -> {
                    getBridge().getWebView().loadUrl(url);
                });
            }
        }
    }
}
