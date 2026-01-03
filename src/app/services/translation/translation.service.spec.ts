import {TranslatePipe, translationService} from './translation.service';
import i18next from 'i18next';
import {TestBed} from "@angular/core/testing";
import {ChangeDetectorRef} from "@angular/core";

// ---- MOCKS ----
const mockInit = jasmine.createSpy('init').and.callFake(async (opts: any) => {
    i18next.language = opts.lng || 'en';
    return i18next;
});
const mockT = jasmine.createSpy('t').and.callFake((key: string) => {
    const dict: Record<string, string> = {
        'hello': 'Hello world',
        'fr.greeting': 'Bonjour'
    };
    return dict[key] || key;
});

// Inject mocks into i18next
(i18next.init as any) = mockInit;
(i18next.t as any) = mockT;

describe('Translation system', () => {

    let service: translationService
    const cdrMock = {
        markForCheck: jasmine.createSpy('markForCheck'),
    } as unknown as ChangeDetectorRef;
    beforeEach(() => {
        mockInit.calls.reset();
        mockT.calls.reset();

        TestBed.configureTestingModule({providers: [translationService,
                {provide: ChangeDetectorRef, useValue: cdrMock}]})
        service = TestBed.inject(translationService);

    });

    // --- initI18n ---
    it('should initialize i18n with a given language', async () => {
        // await initI18n('fr');
        await service.init('fr');
        expect(mockInit).toHaveBeenCalled();
        expect(i18next.language).toBe('fr');
    });

    it('should fall back to english if initialization fails', async () => {
        let initCallCount = 0;

        mockInit.and.callFake(async (opts: any) => {
            initCallCount++;

            if (initCallCount === 1) {
                // First call: simulate failure
                return Promise.reject(new Error('fail init'));
            } else {
                // Second call (fallback)
                i18next.language = opts.lng;
                return Promise.resolve(i18next);
            }
        });

        await service.init('whatever');

        //expect(instance.language).toBe('en');
        expect(i18next.language).toBe('en');
    });


    // --- getSupportedLanguages ---
    it('should list supported languages', () => {
        const langs = service.getSupportedLanguages();
        expect(langs).toEqual(['en', 'fr', 'es', 'it', 'de']);
    });

    // --- TranslatePipe ---
    describe('TranslatePipe', () => {

        const pipe: TranslatePipe = new TranslatePipe(cdrMock);

        it('should translate known keys', () => {
            const res = pipe.transform('hello');
            expect(mockT).toHaveBeenCalledWith('hello');
            expect(res).toBe('Hello world');
        });

        it('should return key if translation missing', () => {
            const res = pipe.transform('missing.key');
            expect(res).toBe('missing.key');
        });

        it('should return empty string on empty input', () => {
            expect(pipe.transform('')).toBe('');
        });
    });

    // --- getLocale ---
    it('should get current locale from i18next', () => {
        i18next.language = 'fr-FR';
        const locale = service.getLocale();
        expect(locale).toBe('fr');
    });
});
