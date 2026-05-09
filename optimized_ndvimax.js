/**************** 参数 ****************/

var YEAR = 2024;

var roi = ee.FeatureCollection(
  'projects/changjiangjiance/assets/changjiang6province'
);

Map.centerObject(roi, 6);

/**************** 时间 ****************/

var start = ee.Date.fromYMD(YEAR, 6, 1);
var end = ee.Date.fromYMD(YEAR + 1, 9, 1);

/**************** 云掩膜 ****************/

function maskLandsat(img) {
  var qa = img.select('QA_PIXEL');
  var cloud = qa.bitwiseAnd(1 << 3).eq(0);
  var shadow = qa.bitwiseAnd(1 << 4).eq(0);
  return img.updateMask(cloud.and(shadow));
}

function maskS2(img) {
  var qa = img.select('QA60');
  var cloud = qa.bitwiseAnd(1 << 10).eq(0);
  var cirrus = qa.bitwiseAnd(1 << 11).eq(0);
  return img.updateMask(cloud.and(cirrus));
}

/**************** NDVI + DATE（优化：int16 相对天数） ****************/

function addNDVI_Landsat(img) {
  var sr = img.select('SR_B.*')
    .multiply(0.0000275)
    .add(-0.2);

  var bands = sr.bandNames();

  var red = ee.Image(
    ee.Algorithms.If(
      bands.contains('SR_B4'),
      sr.select('SR_B4'),
      sr.select('SR_B3')
    )
  );

  var nir = ee.Image(
    ee.Algorithms.If(
      bands.contains('SR_B5'),
      sr.select('SR_B5'),
      sr.select('SR_B4')
    )
  );

  var ndvi = nir.subtract(red)
    .divide(nir.add(red))
    .multiply(10000)
    .toInt16()
    .rename('NDVI');

  var dateBand = img.date().difference(start, 'day').toInt16().rename('DATE');

  return ndvi.addBands(dateBand)
    .copyProperties(img, ['system:time_start']);
}

function addNDVI_S2(img) {
  var red = img.select('B4').multiply(0.0001);
  var nir = img.select('B8').multiply(0.0001);

  var ndvi = nir.subtract(red)
    .divide(nir.add(red))
    .multiply(10000)
    .toInt16()
    .rename('NDVI');

  var dateBand = img.date().difference(start, 'day').toInt16().rename('DATE');

  return ndvi.addBands(dateBand)
    .copyProperties(img, ['system:time_start']);
}

/**************** 数据 ****************/

var landsat = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LE07/C02/T1_L2'))
  .merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2'))
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(roi)
  .filterDate(start, end)
  .filter(ee.Filter.calendarRange(6, 8, 'month'))
  .map(maskLandsat)
  .map(addNDVI_Landsat);

var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(roi)
  .filterDate(start, end)
  .filter(ee.Filter.calendarRange(6, 8, 'month'))
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 70))
  .map(maskS2)
  .map(addNDVI_S2);

/**************** 数据选择 ****************/

var collection = ee.ImageCollection(
  ee.Algorithms.If(
    YEAR <= 2018,
    landsat,
    sentinel2
  )
);
print('影像数量', collection.size());

/**************** 核心：主年优先 + 次年补洞（优化：合并clip） ****************/

var col_year = collection.filter(ee.Filter.calendarRange(YEAR, YEAR, 'year'));
var col_year2 = collection.filter(ee.Filter.calendarRange(YEAR + 1, YEAR + 1, 'year'));

var max_year = col_year.qualityMosaic('NDVI');
var max_year2 = col_year2.qualityMosaic('NDVI');

var combined = max_year.unmask(max_year2).clip(roi);

var NDVImax = combined.select('NDVI');
var DATEimg = combined.select('DATE');

/**************** 来源年份 ****************/

var hasYear = max_year.select('NDVI').mask();
var sourceYear = ee.Image.constant(YEAR)
  .updateMask(hasYear)
  .unmask(ee.Image.constant(YEAR + 1))
  .rename('YEAR')
  .clip(roi);

/**************** 可视化 ****************/

Map.addLayer(
  NDVImax,
  { min: 0, max: 9000, palette: ['white', 'yellow', 'green', 'darkgreen'] },
  'NDVImax_' + YEAR
);

var dateRange = ee.Number(end.difference(start, 'day')).subtract(1);
Map.addLayer(
  DATEimg,
  { min: 0, max: dateRange, palette: ['purple', 'blue', 'cyan', 'yellow', 'orange', 'red'] },
  'DATE_' + YEAR
);

Map.addLayer(
  sourceYear,
  { min: YEAR, max: YEAR + 1, palette: ['blue', 'red'] },
  '来源年份（蓝=当年 红=次年）'
);

/**************** 导出 ****************/

var scale = (YEAR <= 2018) ? 30 : 10;

Export.image.toDrive({
  image: NDVImax,
  description: 'NDVImax_' + YEAR,
  folder: 'NDVImax',
  fileNamePrefix: 'NDVImax_' + YEAR,
  region: roi,
  scale: scale,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF',
  formatOptions: { cloudOptimized: true }
});

Export.image.toDrive({
  image: DATEimg,
  description: 'DATE_' + YEAR,
  folder: 'DATE',
  fileNamePrefix: 'DATE_' + YEAR,
  region: roi,
  scale: scale,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF',
  formatOptions: { cloudOptimized: true }
});
