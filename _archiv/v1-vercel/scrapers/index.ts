import type { Scraper } from '../lib/scraper'
import {
  tanzeventsScraper,
  mueveteScraper,
  latinPromotionScraper,
  ecstaticDanceBernScraper,
  forroAareScraper,
  planlosScraper,
  danceAppScraper,
  rosewayScraper,
  kulturhofScraper,
} from './tanz-buehne'
import { schuurScraper, jazzkantineScraper } from './ausgehen'
import { vbgScraper, campfiScraper, zeggScraper } from './retreats'
import { bitvocationScraper } from './festivals'
import { lumaScraper } from './luma'
import { barhoppingScraper } from './sozialleben'

export const scrapers: Scraper[] = [
  tanzeventsScraper,
  mueveteScraper,
  latinPromotionScraper,
  ecstaticDanceBernScraper,
  forroAareScraper,
  planlosScraper,
  danceAppScraper,
  rosewayScraper,
  kulturhofScraper,
  schuurScraper,
  jazzkantineScraper,
  vbgScraper,
  campfiScraper,
  zeggScraper,
  bitvocationScraper,
  lumaScraper,
  barhoppingScraper,
]
