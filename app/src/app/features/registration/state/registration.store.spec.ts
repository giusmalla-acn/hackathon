import { TestBed } from '@angular/core/testing';
import { RegistrationGateway } from '../data/registration.gateway';
import { RegistrationStore } from './registration.store';

const VALID = { name: "Anna D'Angelo", email: 'anna.rossi@esempio.it', password: 'Girasole42' } as const;

describe('RegistrationStore', () => {
  let store: RegistrationStore;
  let register: jest.Mock<Promise<void>, [unknown]>;

  beforeEach(() => {
    register = jest.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: RegistrationGateway, useValue: { register } }],
    });
    store = TestBed.inject(RegistrationStore);
  });

  function fillTo(step: 'email' | 'password' | 'summary'): void {
    store.next(); // welcome → name
    store.setValue('name', VALID.name);
    store.next();
    if (step === 'email') return;
    store.setValue('email', VALID.email);
    store.next();
    if (step === 'password') return;
    store.setValue('password', VALID.password);
    store.next();
  }

  it('starts on welcome with empty values and no errors', () => {
    expect(store.currentStep()).toBe('welcome');
    expect(store.values()).toEqual({ name: '', email: '', password: '' });
    expect(store.currentErrors()).toEqual([]);
    expect(store.submitted()).toBe(false);
  });

  it('does not validate while typing', () => {
    store.next();
    store.setValue('name', 'A');
    expect(store.currentErrors()).toEqual([]);
  });

  it('blocks next when the current field has errors and exposes them', () => {
    fillTo('email');
    store.setValue('email', 'anna.rossi.esempio.it');

    expect(store.next()).toBe(false);
    expect(store.currentStep()).toBe('email');
    expect(store.currentErrors()).toEqual(['EMAIL_MISSING_AT']);
    expect(store.currentField()?.id).toBe('email');
  });

  it('advances once the error is fixed and clears it', () => {
    fillTo('email');
    store.setValue('email', 'anna@');
    store.next();
    store.setValue('email', VALID.email);

    expect(store.next()).toBe(true);
    expect(store.currentStep()).toBe('password');
    expect(store.errors().email).toEqual([]);
  });

  it('preserves values when going back', () => {
    fillTo('password');
    store.setValue('password', 'abc');

    expect(store.prev()).toBe(true);
    expect(store.prev()).toBe(true);
    expect(store.currentStep()).toBe('name');
    expect(store.values()).toEqual({ name: VALID.name, email: VALID.email, password: 'abc' });
  });

  it('cannot go back from welcome', () => {
    expect(store.prev()).toBe(false);
    expect(store.currentStep()).toBe('welcome');
  });

  it('next does nothing from summary: submitting is explicit', () => {
    fillTo('summary');
    expect(store.next()).toBe(false);
    expect(store.currentStep()).toBe('summary');
  });

  it('after "Modifica", a valid next returns straight to the summary', () => {
    fillTo('summary');
    store.edit('email');
    expect(store.currentStep()).toBe('email');
    expect(store.editing()).toBe(true);

    store.setValue('email', 'nuova@esempio.it');
    expect(store.next()).toBe(true);
    expect(store.currentStep()).toBe('summary');
    expect(store.editing()).toBe(false);
    expect(store.values().email).toBe('nuova@esempio.it');
  });

  it('submits the values through the mock gateway and reaches done', async () => {
    fillTo('summary');

    await expect(store.submit()).resolves.toBe(true);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(VALID);
    expect(store.submitted()).toBe(true);
    expect(store.currentStep()).toBe('done');
    expect(store.values().password).toBe('');
    expect(store.values().name).toBe(VALID.name);
  });

  it('exposes submitting while the request is pending and ignores double submits', async () => {
    let resolve!: () => void;
    register.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    fillTo('summary');

    const first = store.submit();
    expect(store.submitting()).toBe(true);
    await expect(store.submit()).resolves.toBe(false);

    resolve();
    await expect(first).resolves.toBe(true);
    expect(store.submitting()).toBe(false);
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('stays on summary and keeps the values when the gateway fails', async () => {
    register.mockRejectedValue(new Error('offline'));
    fillTo('summary');

    await expect(store.submit()).resolves.toBe(false);
    expect(store.submitted()).toBe(false);
    expect(store.currentStep()).toBe('summary');
    expect(store.values()).toEqual(VALID);
  });

  it('does not submit invalid data: goes to the first invalid field in edit mode', async () => {
    fillTo('summary');
    store.setValue('email', 'anna@esempio');

    await expect(store.submit()).resolves.toBe(false);
    expect(register).not.toHaveBeenCalled();
    expect(store.currentStep()).toBe('email');
    expect(store.editing()).toBe(true);
    expect(store.currentErrors()).toEqual(['EMAIL_INVALID_DOMAIN']);
  });

  it('cannot submit outside the summary', async () => {
    await expect(store.submit()).resolves.toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('reset returns to the initial state', async () => {
    fillTo('summary');
    await store.submit();
    store.reset();

    expect(store.currentStep()).toBe('welcome');
    expect(store.values()).toEqual({ name: '', email: '', password: '' });
    expect(store.submitted()).toBe(false);
  });
});
