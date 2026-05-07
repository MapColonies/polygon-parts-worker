import { container } from 'tsyringe';
import { SERVICES } from '../../src/common/constants';
import type { InjectionObject } from '../../src/common/dependencyRegistration';
import { configMock, registerDefaultConfig } from '../unit/mocks/configMock';
import { loggerMock, tracerMock } from '../unit/mocks/telemetryMock';

function getTestContainerConfig(configProxy: unknown = configMock, extra?: InjectionObject<unknown>[]): InjectionObject<unknown>[] {
  registerDefaultConfig();

  return [
    { token: SERVICES.LOGGER, provider: { useValue: loggerMock } },
    { token: SERVICES.TRACER, provider: { useValue: tracerMock } },
    { token: SERVICES.CONFIG, provider: { useValue: configProxy } },
    ...(extra ?? []),
  ];
}

function registerTestValues(configProxy: unknown, extra?: InjectionObject<unknown>[]): void {
  const overrides = getTestContainerConfig(configProxy, extra);
  for (const inj of overrides) {
    container.register(inj.token, inj.provider as never);
  }
}

const resetContainer = (clearInstances = true): void => {
  if (clearInstances) {
    container.clearInstances();
  }
  container.reset();
};

export { getTestContainerConfig, registerTestValues, resetContainer };
