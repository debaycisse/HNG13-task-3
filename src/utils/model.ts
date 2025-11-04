import { clothingData } from "./data"

const CLOTH_LENGTH = 4

export const  getEventBasedMaleCloth = (eventName: string): string => {
  if (eventName.includes('interview'))
    return clothingData
    .male
    .categories
    .interview[Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('meet-up'))
    return clothingData
    .male
    .categories['meet-up'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('bar-beach'))
    return clothingData
    .male
    .categories['bar-beach'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('burial'))
    return clothingData
    .male
    .categories['burial'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('wedding'))
    return clothingData
    .male
    .categories['wedding'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('casual'))
    return clothingData
    .male
    .categories['casual'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('business'))
    return clothingData
    .male
    .categories['business meeting'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('sport'))
    return clothingData
    .male
    .categories['sports'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('game'))
    return clothingData
    .male
    .categories['game'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else
    return ''
}

export const  getEventBasedFemaleCloth = (eventName: string): string => {
  if (eventName.includes('interview'))
    return clothingData
    .female
    .categories
    .interview[Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('meet-up'))
    return clothingData
    .female
    .categories['meet-up'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('bar-beach'))
    return clothingData
    .female
    .categories['bar-beach'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('burial'))
    return clothingData
    .female
    .categories['burial'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('wedding'))
    return clothingData
    .female
    .categories['wedding'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('casual'))
    return clothingData
    .female
    .categories['casual'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('business meeting'))
    return clothingData
    .female
    .categories['business meeting'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('sport'))
    return clothingData
    .female
    .categories['sports'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else if (eventName.includes('game'))
    return clothingData
    .female
    .categories['game'][Math.floor(Math.random() * CLOTH_LENGTH)]
  else
    return ''
}
