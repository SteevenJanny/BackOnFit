import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {ScannerComponent} from './scanner.component';
import {SessionService} from '../../services/session.service';
import {DebuggerModeService} from '../../services/debugger.service';
import {ModalController} from '@ionic/angular';
import {CapacitorBarcodeScanner, CapacitorBarcodeScannerScanResult} from '@capacitor/barcode-scanner';

describe('ScannerComponent', () => {
    let component: ScannerComponent;
    let fixture: ComponentFixture<ScannerComponent>;

    let sessionService: jasmine.SpyObj<SessionService>;
    let debuggerService: jasmine.SpyObj<DebuggerModeService>;
    let modalCtrl: jasmine.SpyObj<ModalController>;

    beforeEach(async () => {
        sessionService = jasmine.createSpyObj('SessionService', [
            'processQR',
            'saveSession'
        ]);
        debuggerService = jasmine.createSpyObj('DebuggerModeService', ['notify']);
        modalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);

        await TestBed.configureTestingModule({
            imports: [ScannerComponent],
            providers: [
                {provide: SessionService, useValue: sessionService},
                {provide: DebuggerModeService, useValue: debuggerService},
                {provide: ModalController, useValue: modalCtrl}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ScannerComponent);
        component = fixture.componentInstance;
    });
    it('should dismiss modal on close', () => {
        component.close();
        expect(modalCtrl.dismiss).toHaveBeenCalled();
    });
    it('should process QR code, save session and close modal', fakeAsync(async () => {
        const scanResult = {ScanResult: 'QR_DATA'};
        const session = {id: 's1'} as any;

        spyOn(CapacitorBarcodeScanner, 'scanBarcode')
            .and.resolveTo(scanResult as CapacitorBarcodeScannerScanResult);

        sessionService.processQR.and.resolveTo(session);
        sessionService.saveSession.and.resolveTo();

        await component.openScanModal();
        tick();

        expect(sessionService.processQR).toHaveBeenCalledWith('QR_DATA');
        expect(sessionService.saveSession).toHaveBeenCalledWith(session);
        expect(modalCtrl.dismiss).toHaveBeenCalled();
    }));
    it('should do nothing if scan result is empty', fakeAsync(async () => {
        spyOn(CapacitorBarcodeScanner, 'scanBarcode')
            .and.resolveTo({ScanResult: null} as any);

        await component.openScanModal();
        tick();

        expect(sessionService.processQR).not.toHaveBeenCalled();
        expect(sessionService.saveSession).not.toHaveBeenCalled();
        expect(modalCtrl.dismiss).not.toHaveBeenCalled();
    }));
    it('should notify debugger on scan error', fakeAsync(async () => {
        spyOn(CapacitorBarcodeScanner, 'scanBarcode')
            .and.rejectWith(new Error('Camera error'));

        await component.openScanModal();
        tick();

        expect(debuggerService.notify)
            .toHaveBeenCalledWith(jasmine.stringContaining('Error during QR scan'));
    }));
});

