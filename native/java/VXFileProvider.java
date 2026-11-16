package com.sadia.ai;

import androidx.core.content.FileProvider;

/** Separate subclass so it does not clash with Capacitor's own FileProvider entry. */
public class VXFileProvider extends FileProvider {}
