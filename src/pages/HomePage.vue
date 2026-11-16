<script setup lang="ts">
import AboutSection from '@/components/AboutSection.vue'
import ContactSection from '@/components/ContactSection.vue'
import CursorDot from '@/components/CursorDot.vue'
import HeroSection from '@/components/HeroSection.vue'
import MarqueeBand from '@/components/MarqueeBand.vue'
import PageLoader from '@/components/PageLoader.vue'
import PhotoWall from '@/components/PhotoWall.vue'
import PostList from '@/components/PostList.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import StickerLayer from '@/components/StickerLayer.vue'
import TopBar from '@/components/TopBar.vue'
import VeinsCanvas from '@/components/VeinsCanvas.vue'
import { usePageLoader } from '@/composables/usePageLoader'
import { useReveal } from '@/composables/useReveal'
import '@/styles/home.css'

const { done, visible, sheetAOut, sheetBOut } = usePageLoader()

useReveal(done)
</script>

<template>
  <PageLoader v-if="visible" :sheet-a-out="sheetAOut" :sheet-b-out="sheetBOut" />
  <VeinsCanvas :active="done" />
  <CursorDot />
  <TopBar />

  <main id="top" class="relative z-2">
    <HeroSection />
    <MarqueeBand />
    <AboutSection />
    <PhotoWall />
    <PostList />
    <ContactSection />
  </main>

  <SiteFooter />
  <StickerLayer />
</template>
