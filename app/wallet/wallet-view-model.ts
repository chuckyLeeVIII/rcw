import { Observable, File, knownFolders, path } from '@nativescript/core';
import { WalletManager, WalletInfo, AdvancedRecoveryParams } from '../utils/wallet';

export class WalletViewModel extends Observable {
    private _recoveryInput: string = '';
    private _wallet: WalletInfo | null = null;
    private _masterKey: string = '';
    private _salt: string = '';
    private _iv: string = '';
    private _iterations: string = '100000';
    private _rawInput: string = '';
    private _selectedFile: string = '';

    // Basic getters/setters
    get recoveryInput(): string { return this._recoveryInput; }
    set recoveryInput(value: string) {
        if (this._recoveryInput !== value) {
            this._recoveryInput = value;
            this.notifyPropertyChange('recoveryInput', value);
        }
    }

    get wallet(): WalletInfo | null { return this._wallet; }
    get masterKey(): string { return this._masterKey; }
    set masterKey(value: string) {
        if (this._masterKey !== value) {
            this._masterKey = value;
            this.notifyPropertyChange('masterKey', value);
        }
    }

    get salt(): string { return this._salt; }
    set salt(value: string) {
        if (this._salt !== value) {
            this._salt = value;
            this.notifyPropertyChange('salt', value);
        }
    }

    get iv(): string { return this._iv; }
    set iv(value: string) {
        if (this._iv !== value) {
            this._iv = value;
            this.notifyPropertyChange('iv', value);
        }
    }

    get iterations(): string { return this._iterations; }
    set iterations(value: string) {
        if (this._iterations !== value) {
            this._iterations = value;
            this.notifyPropertyChange('iterations', value);
        }
    }

    get rawInput(): string { return this._rawInput; }
    set rawInput(value: string) {
        if (this._rawInput !== value) {
            this._rawInput = value;
            this.notifyPropertyChange('rawInput', value);
        }
    }

    get selectedFile(): string { return this._selectedFile; }
    set selectedFile(value: string) {
        if (this._selectedFile !== value) {
            this._selectedFile = value;
            this.notifyPropertyChange('selectedFile', value);
        }
    }

    async onBasicRecover() {
        try {
            const wallet = await WalletManager.validateAndRecover(this._recoveryInput.trim());
            this._wallet = wallet;
            this.notifyPropertyChange('wallet', wallet);
        } catch (error) {
            console.error('Basic recovery failed:', error);
            // Show error dialog
        }
    }

    async onAdvancedRecover() {
        try {
            const params: AdvancedRecoveryParams = {
                masterKey: this._masterKey,
                salt: this._salt,
                iv: this._iv,
                iterations: parseInt(this._iterations, 10),
                rawInput: this._rawInput
            };

            const wallet = await WalletManager.advancedRecover(params);
            this._wallet = wallet;
            this.notifyPropertyChange('wallet', wallet);
        } catch (error) {
            console.error('Advanced recovery failed:', error);
            // Show error dialog
        }
    }

    async onChooseFile() {
        try {
            // Note: This is a simplified version. In a real app, you'd use a proper file picker
            // and handle the file reading appropriately
            const documents = knownFolders.documents();
            const filePath = path.join(documents.path, "wallet.json");
            
            if (File.exists(filePath)) {
                const file = File.fromPath(filePath);
                const content = await file.readText();
                
                this.selectedFile = filePath;
                const wallet = await WalletManager.recoverFromFile(content);
                this._wallet = wallet;
                this.notifyPropertyChange('wallet', wallet);
            }
        } catch (error) {
            console.error('File recovery failed:', error);
            // Show error dialog
        }
    }
}