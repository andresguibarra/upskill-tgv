// Reemplaza al filtro `| currency` de Vue 2 (los filtros no existen en Vue 3).
const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

export const formatCurrency = (value: number) => formatter.format(value)
