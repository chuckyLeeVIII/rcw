import { EventData, Page } from '@nativescript/core';
import { WalletViewModel } from './wallet-view-model';

export function onNavigatingTo(args: EventData) {
    const page = <Page>args.object;
    page.bindingContext = new WalletViewModel();
}