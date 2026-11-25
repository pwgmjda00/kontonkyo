import { jstDay, CATALOG_CUTOVER } from '../../muka1-preview/catalog.js';
// A delayed release must move the cutover forward and rerun compatibility tests.
if (jstDay() >= CATALOG_CUTOVER) {
  throw new Error('Catalog cutover expired; choose a future JST date and reverify before deployment');
}
