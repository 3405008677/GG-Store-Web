<script setup lang="ts">
/** BOM 区块只抛出用户意图，由首页决定提示、跳转或打开上传面板。 */
const emit = defineEmits<{
  action: [action: 'bom']
}>()
</script>

<template>
  <section id="bom-service" class="bom-section">
    <div class="page-container bom-card">
      <div>
        <span>SMART BOM SERVICE</span>
        <h2>上传 BOM，快速完成多型号配单</h2>
        <p>自动识别型号与数量，推荐现货和可替代物料，提高研发与采购效率。</p>
      </div>
      <button type="button" @click="emit('action', 'bom')">上传 BOM 文件</button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.page-container {
  width: min(1280px, calc(100% - 40px));
  margin: 0 auto;
}

.bom-section {
  padding: 48px 0;
}

.bom-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 150px;
  padding: 30px 52px;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 82% 50%, rgb(95 207 255 / 24%), transparent 26%),
    linear-gradient(115deg, #103f89, #1768d7 58%, #188ed3);
  border-radius: 6px;

  &::after {
    position: absolute;
    right: 17%;
    width: 120px;
    height: 120px;
    border: 24px solid rgb(255 255 255 / 7%);
    border-radius: 50%;
    content: '';
  }

  > div {
    position: relative;
    z-index: 2;
  }

  span {
    color: #9fdcff;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  h2 {
    margin: 7px 0 9px;
    font-size: 24px;
  }

  p {
    margin: 0;
    color: rgb(239 248 255 / 72%);
    font-size: 12px;
  }

  button {
    position: relative;
    z-index: 2;
    min-width: 148px;
    height: 44px;
    color: var(--mall-primary-dark);
    font-weight: 700;
    background: #fff;
    border: 0;
    border-radius: 4px;
    box-shadow: 0 10px 22px rgb(6 47 110 / 18%);
    cursor: pointer;
  }
}

@media (max-width: 780px) {
  .page-container {
    width: min(1280px, calc(100% - 24px));
  }

  .bom-card {
    align-items: flex-start;
    padding: 28px;

    p {
      max-width: 72%;
    }

    button {
      position: absolute;
      right: 26px;
      bottom: 26px;
      min-width: 128px;
    }
  }
}

@media (max-width: 560px) {
  .bom-card {
    display: grid;
    gap: 22px;

    h2 {
      font-size: 20px;
    }

    p {
      max-width: none;
      line-height: 1.6;
    }

    button {
      position: relative;
      right: auto;
      bottom: auto;
      justify-self: start;
    }
  }
}
</style>
