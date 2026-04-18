// xrStore – WebXR Store Singleton (modul-weit geteilt zwischen SceneViewer und App)
// model:false verhindert CDN-Download des Controller-GLTF-Modells
// rayPointer:true behält den Controller-Ray für onClick auf Meshes

import { createXRStore } from '@react-three/xr'

export const xrStore = createXRStore({
  controller: { model: false, rayPointer: true, grabPointer: false, teleportPointer: false },
  hand: false,
})
