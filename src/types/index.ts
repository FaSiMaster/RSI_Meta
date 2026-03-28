// Typen fuer RSI VR Tool – FaSi Kanton Zürich

export interface Scene {
  id: string
  name: string
  imageUrl: string
  deficits: unknown[]
}

export interface Topic {
  id: string
  name: string
  scenes: Scene[]
}

export interface UserSession {
  userName: string
  topicId: string
  sceneId: string
}
