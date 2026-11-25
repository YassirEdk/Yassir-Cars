/* Stock photos shipped with the site have a light WebP twin
   (scripts/build-images.mjs), a tenth of the weight. The database keeps pointing
   at the PNG, so the swap happens where a photo is shown. */
const STOCK = ['508_BLEU', 'Class e', 'Clio', 'Logan', 'New-tucson-1860x540', 'Toyota Land Cruiser']
const TWINS = new Map(STOCK.map(name => [`/cars-fit/${name}.png`, `/cars-fit/${name}.webp`]))

export const lightPhoto = (url) => TWINS.get(url) ?? TWINS.get(decodeURI(url ?? '')) ?? url
