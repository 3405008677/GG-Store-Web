<script setup lang="ts">
defineOptions({ name: 'CatalogProductCard' })

interface CatalogProductCardProps {
  productId: number
  name: string
  subtitle?: string
  imageUrl: string
  merchantName: string
  categoryName: string
  minimumPrice: number | null
  maximumPrice?: number | null
  supportingText?: string
  pending?: boolean
}

const props = withDefaults(defineProps<CatalogProductCardProps>(), {
  subtitle: '',
  maximumPrice: null,
  supportingText: '',
  pending: false,
})

const emit = defineEmits<{
  select: [productId: number, navigate: boolean]
}>()

const imageFailed = ref(false)

watch(
  () => props.imageUrl,
  () => {
    imageFailed.value = false
  },
)

const productPath = computed(() => `/products/${props.productId}`)

const priceFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const priceText = computed(() => {
  if (props.minimumPrice == null) return '价格待询'
  const minimum = priceFormatter.format(props.minimumPrice)
  if (props.maximumPrice != null && props.maximumPrice > props.minimumPrice) {
    return `${minimum} – ${priceFormatter.format(props.maximumPrice)}`
  }
  return minimum
})

/** 所有可观测点击都提交归因；只有普通左键由列表页接管 SPA 导航。 */
function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || props.pending) return

  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    emit('select', props.productId, false)
    return
  }

  event.preventDefault()
  emit('select', props.productId, true)
}

/** 中键打开新标签时保留原生行为，同时在当前页面异步记录选择。 */
function handleAuxClick(event: MouseEvent): void {
  if (event.button === 1 && !props.pending) {
    emit('select', props.productId, false)
  }
}
</script>

<template>
  <article class="catalog-product-card" :class="{ 'is-pending': props.pending }">
    <NuxtLink
      class="catalog-product-card__link"
      :to="productPath"
      :aria-busy="props.pending"
      @click="handleClick"
      @auxclick="handleAuxClick"
    >
      <div class="catalog-product-card__media">
        <img
          v-if="props.imageUrl && !imageFailed"
          :src="props.imageUrl"
          :alt="`${props.name} 商品图片`"
          loading="lazy"
          decoding="async"
          @error="imageFailed = true"
        />
        <div v-else class="catalog-product-card__placeholder" aria-label="暂无商品图片">
          <span aria-hidden="true">商品</span>
        </div>
        <span class="catalog-product-card__category">{{ props.categoryName }}</span>
      </div>

      <div class="catalog-product-card__body">
        <p class="catalog-product-card__merchant">{{ props.merchantName }}</p>
        <h2>{{ props.name }}</h2>
        <p class="catalog-product-card__subtitle">{{ props.subtitle || '暂无商品副标题' }}</p>

        <footer>
          <div>
            <strong :class="{ 'is-unpriced': props.minimumPrice == null }">{{ priceText }}</strong>
            <small v-if="props.supportingText">{{ props.supportingText }}</small>
          </div>
          <span class="catalog-product-card__action" aria-hidden="true">
            {{ props.pending ? '打开中…' : '查看详情' }}
          </span>
        </footer>
      </div>
    </NuxtLink>
  </article>
</template>

<style lang="scss" scoped>
.catalog-product-card {
  min-width: 0;
  overflow: hidden;
  background: var(--mall-color-surface);
  border: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-medium);
  box-shadow: 0 6px 18px rgb(37 50 73 / 4%);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;

  &:hover {
    border-color: rgb(23 104 215 / 38%);
    box-shadow: var(--mall-shadow-card);
    transform: translateY(-3px);
  }

  &.is-pending {
    pointer-events: none;
    opacity: 0.72;
  }
}

.catalog-product-card__link {
  display: flex;
  height: 100%;
  color: inherit;
  text-decoration: none;
  flex-direction: column;
}

.catalog-product-card__media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background:
    linear-gradient(145deg, rgb(23 104 215 / 5%), transparent 65%),
    var(--mall-color-surface-muted);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 18px;
    transition: transform 220ms ease;
  }

  .catalog-product-card:hover & img {
    transform: scale(1.035);
  }
}

.catalog-product-card__placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  color: #9aa8ba;
  place-items: center;

  span {
    display: grid;
    width: 70px;
    height: 70px;
    font-size: 15px;
    font-weight: 700;
    background: #fff;
    border: 1px dashed #cbd5e1;
    border-radius: 50%;
    place-items: center;
  }
}

.catalog-product-card__category {
  position: absolute;
  top: 12px;
  left: 12px;
  max-width: calc(100% - 24px);
  padding: 4px 9px;
  overflow: hidden;
  color: #315579;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgb(255 255 255 / 90%);
  border: 1px solid rgb(23 104 215 / 12%);
  border-radius: 999px;
  backdrop-filter: blur(6px);
}

.catalog-product-card__body {
  display: flex;
  min-height: 190px;
  padding: 18px;
  flex: 1;
  flex-direction: column;

  h2 {
    display: -webkit-box;
    min-height: 48px;
    margin: 5px 0 6px;
    overflow: hidden;
    color: var(--mall-color-text);
    font-size: 16px;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  footer {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    justify-content: space-between;
    padding-top: 16px;
    margin-top: auto;
    border-top: 1px solid #eef1f5;

    > div {
      display: grid;
      min-width: 0;
      gap: 3px;
    }

    strong {
      color: #e5484d;
      font-size: clamp(16px, 1.4vw, 20px);
      line-height: 1.2;

      &.is-unpriced {
        color: var(--mall-color-muted);
        font-size: 15px;
      }
    }

    small {
      overflow: hidden;
      color: var(--mall-color-muted);
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.catalog-product-card__merchant {
  margin: 0;
  overflow: hidden;
  color: var(--mall-color-primary);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-product-card__subtitle {
  display: -webkit-box;
  min-height: 42px;
  margin: 0 0 16px;
  overflow: hidden;
  color: var(--mall-color-muted);
  font-size: 13px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.catalog-product-card__action {
  color: var(--mall-color-primary);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .catalog-product-card__link {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
  }

  .catalog-product-card__media {
    aspect-ratio: auto;
    min-height: 180px;

    img {
      padding: 12px;
    }
  }

  .catalog-product-card__category {
    top: 8px;
    left: 8px;
    max-width: calc(100% - 16px);
  }

  .catalog-product-card__body {
    min-height: 180px;
    padding: 14px;

    h2 {
      min-height: 44px;
      font-size: 15px;
    }

    footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  .catalog-product-card__subtitle {
    min-height: 40px;
    margin-bottom: 12px;
  }
}
</style>
