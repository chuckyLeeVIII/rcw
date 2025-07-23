import { Application } from '@nativescript/core';
import { Buffer } from 'buffer';

// Set up global Buffer for crypto operations
global.Buffer = Buffer;

Application.run({ moduleName: 'app-root' });