import { TestBed } from '@angular/core/testing';
import { MockRegistrationGateway, RegistrationGateway } from './registration.gateway';

describe('RegistrationGateway', () => {
  it('defaults to the mock, which resolves without side effects', async () => {
    const gateway = TestBed.inject(RegistrationGateway);
    const log = jest.spyOn(console, 'log');

    expect(gateway).toBeInstanceOf(MockRegistrationGateway);
    await expect(gateway.register({ name: 'Anna', email: 'a@b.it', password: 'Girasole42' })).resolves.toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });
});
