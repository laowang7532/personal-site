export interface ProfileCard {
  key: string
  text: string
}

export interface Profile {
  name: string
  title: string
  description: string
  eyebrow: string
  heroLines: string[]
  heroLede: string
  about: {
    lead: string
    paragraphs: string[]
    cards: ProfileCard[]
  }
  contact: {
    lead: string
    email: string
    github: string
  }
  footer: {
    copyright: string
    tagline: string
  }
}

export interface PhotoEntry {
  slot: string
  caption: string
  src?: string | null
  alt?: string
}
