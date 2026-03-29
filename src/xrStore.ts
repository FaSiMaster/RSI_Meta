// xrStore – WebXR Store Singleton (modul-weit geteilt zwischen SceneViewer und App)
// model:false verhindert CDN-Download des Controller-GLTF-Modells
// rayPointer:true behaelt den Controller-Ray fuer onClick auf Meshes

import { createXRStore } from '@react-three/xr'

export const xrStore = createXRStore({
  controller: { model: false, rayPointer: true, grabPointer: false, teleportPointer: false },
  hand: false,
})
