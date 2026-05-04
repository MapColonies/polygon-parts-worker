import { type ConfigInstance, config } from '@map-colonies/config';
import { commonBoilerplateV3, type commonBoilerplateV3Type } from '@map-colonies/schemas';

type RawConfig = ConfigInstance<commonBoilerplateV3Type>;

type ConfigType = Omit<RawConfig, 'get'> & {
  get: <T = unknown>(key: string) => T;
};

let configInstance: ConfigType | undefined;

async function initConfig(offlineMode?: boolean): Promise<void> {
  configInstance = (await config({
    schema: commonBoilerplateV3,
    offlineMode,
  })) as unknown as ConfigType;
}

function getConfig(): ConfigType {
  if (!configInstance) {
    throw new Error('config not initialized');
  }
  return configInstance;
}

export type { ConfigType };
export { getConfig, initConfig };
