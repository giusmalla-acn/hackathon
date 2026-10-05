import { TestBed } from '@angular/core/testing';
import { MOCK_REGISTRATION_DELAY_MS, MockRegistrationGateway, RegistrationGateway } from './registration.gateway';

describe('RegistrationGateway', () => {
  afterEach(() => jest.useRealTimers());

  it('defaults to the mock, which resolves without side effects', async () => {
    const gateway = TestBed.inject(RegistrationGateway);
    const log = jest.spyOn(console, 'log');

    expect(gateway).toBeInstanceOf(MockRegistrationGateway);
    await expect(gateway.register({ name: 'Anna', email: 'a@b.it', password: 'Girasole42' })).resolves.toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });

  it('resolves only after the simulated latency of 500 ms', async () => {
    jest.useFakeTimers();
    const done = jest.fn();
    TestBed.inject(RegistrationGateway)
      .register({ name: 'Anna', email: 'a@b.it', password: 'Girasole42' })
      .then(done);

    await jest.advanceTimersByTimeAsync(MOCK_REGISTRATION_DELAY_MS - 1);
    expect(done).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
    expect(MOCK_REGISTRATION_DELAY_MS).toBe(500);
  });
});
