<!-- Vue 2 / Options API: así se veía antes. Sigue funcionando en Vue 3. -->
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: { start: { type: Number, default: 0 } },
  emits: ['change'],
  data() {
    return { count: this.start }
  },
  computed: {
    double(): number {
      return this.count * 2
    },
  },
  watch: {
    count(value: number) {
      this.$emit('change', value)
    },
  },
  mounted() {
    console.debug('mounted con', this.count)
  },
  methods: {
    inc() {
      this.count++
    },
  },
})
</script>

<template>
  <button @click="inc">{{ count }} (x2 = {{ double }})</button>
</template>
