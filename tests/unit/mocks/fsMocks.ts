import path from 'path';
import fsMock from 'mock-fs';

export const mockFSWithShapefiles = (shapefilePath: string): void => {
  const shapefileBasePath = path.parse(shapefilePath);
  const basePathWithoutExt = path.join(shapefileBasePath.dir, shapefileBasePath.name);
  fsMock({
    [`${basePathWithoutExt}.shp`]: 'mock shp content',
    [`${basePathWithoutExt}.shx`]: 'mock shx content',
    [`${basePathWithoutExt}.dbf`]: 'mock dbf content',
    [`${basePathWithoutExt}.prj`]: 'mock prj content',
    [`${basePathWithoutExt}.cpg`]: 'mock cpg content',
  });
};
