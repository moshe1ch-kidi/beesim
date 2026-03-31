/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  RotateCw, 
  Play, 
  Trash2, 
  RefreshCw,
  Bug,
  Target,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Footprints,
  X,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GRID_SIZE = 8;
const CELL_SIZE = 50; // pixels

type Command = 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT';

interface Position {
  x: number;
  y: number;
}

type Theme = 'GARDEN' | 'CITY' | 'SPACE' | 'FOREST' | 'CONSTRUCTION' | 'MOON' | 'FARM' | 'CASTLE' | 'DESERT' | 'JUNGLE' | 'SNOW' | 'OCEAN' | 'VOLCANO' | 'AMUSEMENT_PARK' | 'FUTURE_CITY';

interface Level {
  id: number;
  startPos: Position;
  startRotation: number;
  targetPos: Position;
  obstacles: Position[];
  path?: Position[];
  description: string;
  theme: Theme;
  imageUrl?: string;
}

const LEVELS: Level[] = [
  { 
    id: 1, 
    startPos: { x: 0, y: 7 }, 
    startRotation: 0, 
    targetPos: { x: 0, y: 4 }, 
    obstacles: [], 
    path: [{ x: 0, y: 7 }, { x: 0, y: 6 }, { x: 0, y: 5 }, { x: 0, y: 4 }],
    description: "Garden Warm-up: Three steps forward among the flowers", 
    theme: 'GARDEN',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/1.png'
  },
  { 
    id: 2, 
    startPos: { x: 0, y: 7 }, 
    startRotation: 0, 
    targetPos: { x: 2, y: 5 }, 
    obstacles: [{ x: 0, y: 6 }, { x: 1, y: 6 }], 
    path: [{ x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 2, y: 6 }, { x: 2, y: 5 }],
    description: "Dense Forest: Bypass the thorn bushes in the forest", 
    theme: 'FOREST',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/2.jpg'
  },
  { 
    id: 3, 
    startPos: { x: 0, y: 7 }, 
    startRotation: 90, 
    targetPos: { x: 7, y: 7 }, 
    obstacles: [{ x: 3, y: 7 }, { x: 4, y: 7 }], 
    path: [{ x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 }],
    description: "Busy City: Drive on the city highway", 
    theme: 'CITY',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/3.jpg'
  },
  { 
    id: 4, 
    startPos: { x: 0, y: 7 }, 
    startRotation: 0, 
    targetPos: { x: 3, y: 4 }, 
    obstacles: [{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }], 
    path: [{ x: 0, y: 7 }, { x: 0, y: 6 }, { x: 0, y: 5 }, { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }],
    description: "Construction Site: Bypass the cranes at the construction site", 
    theme: 'CONSTRUCTION',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/4.jpg'
  },
  { 
    id: 5, 
    startPos: { x: 2, y: 7 }, 
    startRotation: 0, 
    targetPos: { x: 5, y: 2 }, 
    obstacles: [
      { x: 0, y: 0 }, { x: 7, y: 7 }, { x: 0, y: 7 }, { x: 7, y: 0 }
    ], 
    path: [
      { x: 2, y: 7 }, { x: 2, y: 6 }, { x: 2, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 },
      { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }
    ],
    description: "Deep Space: Clear path through the stars", 
    theme: 'SPACE',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/5.jpg'
  },
  { 
    id: 6, 
    startPos: { x: 0, y: 0 }, 
    startRotation: 90, 
    targetPos: { x: 7, y: 7 }, 
    obstacles: [
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 },
      { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 }, { x: 3, y: 6 }, { x: 3, y: 7 },
      { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 },
      { x: 6, y: 2 }
    ], 
    path: [
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 }, { x: 0, y: 7 },
      { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 2, y: 6 }, { x: 2, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 },
      { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 }, { x: 4, y: 7 },
      { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 }
    ],
    description: "On the Moon: Winding navigation between moon craters", 
    theme: 'MOON',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/6.jpg'
  },
  { 
    id: 7, 
    startPos: { x: 0, y: 7 }, 
    startRotation: 0, 
    targetPos: { x: 3, y: 3 }, 
    obstacles: [
      { x: 1, y: 7 }, { x: 1, y: 6 }, { x: 1, y: 5 }, { x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 2 },
      { x: 3, y: 7 }, { x: 3, y: 6 }, { x: 3, y: 5 }, { x: 3, y: 4 },
      { x: 5, y: 7 }, { x: 5, y: 6 }, { x: 5, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 2 }
    ], 
    path: [
      { x: 0, y: 7 }, { x: 0, y: 6 }, { x: 0, y: 5 }, { x: 0, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }
    ],
    description: "On the Farm: Challenging snail maze inside the farm", 
    theme: 'FARM',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/7.jpg'
  },
  { 
    id: 8, 
    startPos: { x: 0, y: 7 }, 
    startRotation: 0, 
    targetPos: { x: 7, y: 0 }, 
    obstacles: [
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 },
      { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }
    ], 
    path: [
      { x: 0, y: 7 }, { x: 0, y: 6 }, { x: 0, y: 5 }, { x: 0, y: 4 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }
    ],
    description: "In the Castle: Find the winding path through the castle walls", 
    theme: 'CASTLE',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/8.jpg'
  },
  { 
    id: 9, 
    startPos: { x: 0, y: 0 }, 
    startRotation: 90, 
    targetPos: { x: 7, y: 7 }, 
    obstacles: [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 },
      { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }
    ], 
    path: [
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 6, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 4 }, { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 7, y: 7 }
    ],
    description: "In the Desert: Snake path between sand dunes", 
    theme: 'DESERT',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/9.jpg'
  },
  { 
    id: 10, 
    startPos: { x: 0, y: 7 }, 
    startRotation: 0, 
    targetPos: { x: 7, y: 0 }, 
    obstacles: [
      { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 }, { x: 1, y: 6 },
      { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 },
      { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 }
    ], 
    path: [
      { x: 0, y: 7 }, { x: 0, y: 6 }, { x: 0, y: 5 }, { x: 0, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 },
      { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }, { x: 2, y: 7 },
      { x: 3, y: 7 }, { x: 4, y: 7 },
      { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 4, y: 1 }, { x: 4, y: 0 },
      { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }
    ],
    description: "In the Jungle: Zig-zag path between carnivorous plants", 
    theme: 'JUNGLE',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/10.jpg'
  },
  { 
    id: 11, 
    startPos: { x: 0, y: 0 }, 
    startRotation: 90, 
    targetPos: { x: 7, y: 7 }, 
    obstacles: [
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 },
      { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 }, { x: 3, y: 6 }, { x: 3, y: 7 },
      { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }
    ], 
    path: [
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 }, { x: 0, y: 7 },
      { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 2, y: 6 }, { x: 2, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 },
      { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 }, { x: 4, y: 7 },
      { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 }
    ],
    description: "In the Snow: Giant slalom between snow hills", 
    theme: 'SNOW',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/11.jpg'
  },
  { 
    id: 12, 
    startPos: { x: 0, y: 0 }, 
    startRotation: 0, 
    targetPos: { x: 7, y: 0 }, 
    obstacles: [
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }
    ], 
    path: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }
    ],
    description: "In the Ocean: Challenging cruise over the coral reef", 
    theme: 'OCEAN',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/12.jpg'
  },
  { 
    id: 13, 
    startPos: { x: 0, y: 7 }, 
    startRotation: 0, 
    targetPos: { x: 7, y: 0 }, 
    obstacles: [
      { x: 1, y: 7 }, { x: 1, y: 6 }, { x: 1, y: 5 },
      { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 },
      { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }
    ], 
    path: [
      { x: 0, y: 7 }, { x: 0, y: 6 }, { x: 0, y: 5 }, { x: 0, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }
    ],
    description: "At the Volcano: Challenging path around the volcano crater", 
    theme: 'VOLCANO',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/13.jpg'
  },
  { 
    id: 14, 
    startPos: { x: 7, y: 0 }, 
    startRotation: 270, 
    targetPos: { x: 0, y: 7 }, 
    obstacles: [
      { x: 6, y: 0 }, { x: 5, y: 0 }, { x: 4, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 6, y: 1 },
      { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 }, { x: 7, y: 3 },
      { x: 0, y: 5 }, { x: 2, y: 5 }, { x: 4, y: 5 }, { x: 6, y: 5 }
    ], 
    path: [
      { x: 7, y: 0 }, { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 6, y: 2 }, { x: 5, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 6 }, { x: 2, y: 6 }, { x: 1, y: 6 }, { x: 0, y: 6 }, { x: 0, y: 7 }
    ],
    description: "At the Amusement Park: Narrow and winding roller coaster", 
    theme: 'AMUSEMENT_PARK',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/14.jpg'
  },
  { 
    id: 15, 
    startPos: { x: 0, y: 7 }, 
    startRotation: 0, 
    targetPos: { x: 7, y: 0 }, 
    obstacles: [
      { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 },
      { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 },
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }
    ], 
    path: [
      { x: 0, y: 7 }, { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 7, y: 5 }, { x: 7, y: 4 }, { x: 6, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 4 }, { x: 0, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 }, { x: 7, y: 1 }, { x: 7, y: 0 }
    ],
    description: "Future City: The final and hardest maze!", 
    theme: 'FUTURE_CITY',
    imageUrl: 'https://raw.githubusercontent.com/moshe1ch-kidi/imagase/refs/heads/main/bebot/15.jpg'
  },
];

const THEME_IMAGES: Record<Theme, string> = {
  'GARDEN': 'https://picsum.photos/seed/vibrantgarden3d/800/800',
  'CITY': 'https://picsum.photos/seed/modernmetropolis3d/800/800',
  'SPACE': 'https://picsum.photos/seed/deepspace3d/800/800',
  'FOREST': 'https://picsum.photos/seed/denseforest3d/800/800',
  'CONSTRUCTION': 'https://picsum.photos/seed/activeconstruction3d/800/800',
  'MOON': 'https://picsum.photos/seed/lunarlandscape3d/800/800',
  'FARM': 'https://picsum.photos/seed/ruralfarmyard3d/800/800',
  'CASTLE': 'https://picsum.photos/seed/ancientcastle3d/800/800',
  'DESERT': 'https://picsum.photos/seed/hotdesertdunes3d/800/800',
  'JUNGLE': 'https://picsum.photos/seed/tropicaljungle3d/800/800',
  'SNOW': 'https://picsum.photos/seed/coldwinterlandscape3d/800/800',
  'OCEAN': 'https://picsum.photos/seed/underwatercoralworld3d/800/800',
  'VOLCANO': 'https://picsum.photos/seed/volcaniclavalandscape3d/800/800',
  'AMUSEMENT_PARK': 'https://picsum.photos/seed/colorfulamusementpark3d/800/800',
  'FUTURE_CITY': 'https://picsum.photos/seed/futuristicmetropolis3d/800/800',
};

export default function App() {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const currentLevel = LEVELS[currentLevelIdx];
  const [levelImage, setLevelImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const generateLevelImage = async (level: Level, forceAI = false) => {
    if (level.imageUrl && !forceAI) {
      setLevelImage(level.imageUrl);
      setIsGeneratingImage(false);
      return;
    }

    // Use library if available for instant loading, unless forced to use AI
    if (THEME_IMAGES[level.theme] && !forceAI) {
      setLevelImage(THEME_IMAGES[level.theme]);
      setIsGeneratingImage(false);
      return;
    }

    setIsGeneratingImage(true);
    setLevelImage(null);
    try {
      let themeSpecificPrompt = "";
      switch (level.theme) {
        case 'GARDEN':
          themeSpecificPrompt = "Vibrant 3D garden with soft pastel colors, a clear winding path on green grass, giant smiling 3D flowers, small mushrooms, and colorful 3D butterflies. Calm and inviting atmosphere.";
          break;
        case 'FOREST':
          themeSpecificPrompt = "Dense and dark 3D forest with deep green and dark blue trees, thick canopy, sharp purple 3D thorn bushes blocking the narrow path, volumetric sunlight filtering through leaves.";
          break;
        case 'CITY':
          themeSpecificPrompt = "Modern 3D metropolis with stylized glass skyscrapers, neon signs, multi-lane highways, and small 3D toy cars. High-detail urban environment.";
          break;
        case 'CONSTRUCTION':
          themeSpecificPrompt = "Active 3D construction site with exposed metal girders, orange sand piles, scaffolding, and giant yellow 3D cranes blocking the main path with raised arms.";
          break;
        case 'SPACE':
          themeSpecificPrompt = "Infinite 3D deep space with twinkling blue and purple stars, colorful gas nebulae, and small round 3D planets. Zig-zag path between glowing stars.";
          break;
        case 'MOON':
          themeSpecificPrompt = "Gray-blue 3D lunar landscape with many round craters of different sizes, gray moon rocks, and a clear view of the blue 3D Earth in the black sky.";
          break;
        case 'FARM':
          themeSpecificPrompt = "Rural 3D farm with warm colors, green fields, a large red barn, 3D tractors, and cute farm animals. Dirt path blocked by a hay pile and wooden fence.";
          break;
        case 'CASTLE':
          themeSpecificPrompt = "Ancient 3D castle with massive blue-gray stone walls, a water moat, and a small glowing archway at the far end of the wall protected by a burning torch.";
          break;
        case 'DESERT':
          themeSpecificPrompt = "Hot 3D desert with golden, brown, and orange sand dunes, soft round 3D dunes, a thin dirt path winding between them, and a giant bright sun.";
          break;
        case 'JUNGLE':
          themeSpecificPrompt = "Dense, humid, and deep green 3D jungle with giant vines, exotic plants, and a field of giant 3D carnivorous plants with colorful traps and smiling sharp teeth.";
          break;
        case 'SNOW':
          themeSpecificPrompt = "Cold, white, and ice-blue 3D landscape with snow-covered pine trees, round 3D snowmen, giant snowflakes, and a deep snow path ending in a giant snow hill.";
          break;
        case 'OCEAN':
          themeSpecificPrompt = "Clear deep-blue 3D underwater world with a white sand path winding between magnificent purple, pink, and yellow 3D coral structures and small tropical fish.";
          break;
        case 'VOLCANO':
          themeSpecificPrompt = "Hot 3D volcanic landscape with black basalt rocks, glowing orange lava rivers, and small stone platforms floating on lava leading into the volcano's mouth.";
          break;
        case 'AMUSEMENT_PARK':
          themeSpecificPrompt = "Colorful and lively 3D amusement park with twinkling neon lights, game booths, spinning rides, and a marked path leading to a giant roller coaster platform.";
          break;
        case 'FUTURE_CITY':
          themeSpecificPrompt = "Spectacular 3D futuristic metropolis with skyscrapers, highways, flying trains, and a wide complex maze winding between futuristic buildings and a grand victory gate.";
          break;
        default:
          themeSpecificPrompt = "A vibrant 3D world with depth and perspective.";
      }

      const prompt = `A high-quality 3D CLIPART style representative image for a Bee-Bot educational game level. 
      Theme: ${level.theme}. 
      Context: ${themeSpecificPrompt}
      Description: ${level.description}. 
      The image MUST feature 3D objects with clear depth, perspective, and high-quality 3D rendering. 
      All elements must be volumetric 3D models, not flat 2D drawings.
      The style should be vibrant, child-friendly, and look like a professional 3D render. 
      IMPORTANT: No text, no fish in GARDEN, no aquatic animals in non-ocean themes. Just the 3D scene.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const url = `data:image/png;base64,${base64Data}`;
          setLevelImage(url);
          // Cache it in the LEVELS array if possible (though it's a const, we can update the state version if we had one)
          break;
        }
      }
    } catch (error) {
      console.error("Error generating level image:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const [beePos, setBeePos] = useState<Position>(currentLevel.startPos);
  const [beeRotation, setBeeRotation] = useState<number>(currentLevel.startRotation);
  const [commands, setCommands] = useState<Command[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [message, setMessage] = useState<string>("");
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [showAbout, setShowAbout] = useState(false);
  const [score, setScore] = useState(0);

  const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setBeePos(currentLevel.startPos);
    setBeeRotation(currentLevel.startRotation);
    setCommands([]);
    setMessage("");
    generateLevelImage(currentLevel);
  }, [currentLevelIdx]);

  const resetBee = () => {
    setBeePos(currentLevel.startPos);
    setBeeRotation(currentLevel.startRotation);
    setCommands([]);
    setIsExecuting(false);
    setCurrentStep(-1);
    setMessage("");
  };

  const addCommand = (cmd: Command) => {
    if (isExecuting) return;
    if (commands.length + repeatCount > 100) {
      setMessage("Not enough space in the command sequence!");
      return;
    }
    const newCmds = Array(repeatCount).fill(cmd);
    setCommands([...commands, ...newCmds]);
    setRepeatCount(1);
  };

  const removeCommand = (index: number) => {
    if (isExecuting) return;
    setCommands(prev => prev.filter((_, i) => i !== index));
  };

  const clearCommands = () => {
    if (isExecuting) return;
    setCommands([]);
  };

  const nextLevel = () => {
    if (currentLevelIdx < LEVELS.length - 1) {
      setScore(prev => prev + (currentLevelIdx + 1) * 100);
      setCurrentLevelIdx(prev => prev + 1);
      setShowWinModal(false);
    } else {
      setScore(prev => prev + (currentLevelIdx + 1) * 100);
      setMessage("Well done! You finished all levels! 🎉");
      setShowWinModal(false);
    }
  };

  const selectLevel = (idx: number) => {
    setCurrentLevelIdx(idx);
    setShowLevelSelect(false);
    resetBee();
  };

  const isObstacle = (pos: Position) => {
    return currentLevel.obstacles.some(obs => obs.x === pos.x && obs.y === pos.y);
  };

  const executeNextStep = useCallback((stepIndex: number, currentPos: Position, currentRot: number) => {
    if (stepIndex >= commands.length) {
      setIsExecuting(false);
      setCurrentStep(-1);
      
      if (currentPos.x === currentLevel.targetPos.x && currentPos.y === currentLevel.targetPos.y) {
        setMessage("Success! Well done! 🐝✨");
        setTimeout(() => setShowWinModal(true), 500);
      } else {
        setMessage("Sequence finished. Try again!");
      }
      return;
    }

    setCurrentStep(stepIndex);
    const cmd = commands[stepIndex];

    let nextRot = currentRot;
    let nextPos = { ...currentPos };

    if (cmd === 'LEFT') {
      nextRot = (currentRot - 90 + 360) % 360;
    } else if (cmd === 'RIGHT') {
      nextRot = (currentRot + 90) % 360;
    }

    const rad = (nextRot * Math.PI) / 180;
    const dx = Math.round(Math.sin(rad));
    const dy = -Math.round(Math.cos(rad));

    if (cmd === 'FORWARD') {
      const targetX = currentPos.x + dx;
      const targetY = currentPos.y + dy;
      if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE && !isObstacle({ x: targetX, y: targetY })) {
        nextPos.x = targetX;
        nextPos.y = targetY;
      } else {
        setMessage("Boom! You hit an obstacle or a wall! 💥");
        setIsExecuting(false);
        setCurrentStep(-1);
        return;
      }
    } else if (cmd === 'BACKWARD') {
      const targetX = currentPos.x - dx;
      const targetY = currentPos.y - dy;
      if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE && !isObstacle({ x: targetX, y: targetY })) {
        nextPos.x = targetX;
        nextPos.y = targetY;
      } else {
        setMessage("Boom! You hit an obstacle or a wall! 💥");
        setIsExecuting(false);
        setCurrentStep(-1);
        return;
      }
    }

    setBeeRotation(nextRot);
    setBeePos(nextPos);

    executionTimeoutRef.current = setTimeout(() => {
      executeNextStep(stepIndex + 1, nextPos, nextRot);
    }, 500);
  }, [commands, currentLevel]);

  const startExecution = () => {
    if (commands.length === 0 || isExecuting) return;
    setIsExecuting(true);
    executeNextStep(0, beePos, beeRotation);
  };

  useEffect(() => {
    return () => {
      if (executionTimeoutRef.current) clearTimeout(executionTimeoutRef.current);
    };
  }, []);

  const getCommandIcon = (cmd: Command) => {
    switch (cmd) {
      case 'FORWARD': return <ArrowUp size={20} />;
      case 'BACKWARD': return <ArrowDown size={20} />;
      case 'LEFT': return <RotateCcw size={20} />;
      case 'RIGHT': return <RotateCw size={20} />;
    }
  };

  const getThemeStyles = () => {
    switch (currentLevel.theme) {
      case 'GARDEN': return { bg: 'bg-[#98D8A0]', grid: 'border-[#4A7C44]', cellBorder: 'border-[#4A7C44]/60', obs: '🌿', path: 'bg-[#D4E9D2]/80' };
      case 'FOREST': return { bg: 'bg-[#2D5A27]', grid: 'border-[#1B3617]', cellBorder: 'border-[#1B3617]/60', obs: '🌲', path: 'bg-[#3E7A36]/80' };
      case 'CITY': return { bg: 'bg-[#A0A0A0]', grid: 'border-[#404040]', cellBorder: 'border-[#404040]/60', obs: '🏢', path: 'bg-[#BDBDBD]/80' };
      case 'CONSTRUCTION': return { bg: 'bg-[#E6B800]', grid: 'border-[#806600]', cellBorder: 'border-[#806600]/60', obs: '🏗️', path: 'bg-[#FFD633]/80' };
      case 'SPACE': return { bg: 'bg-[#1A1A2E]', grid: 'border-[#303060]', cellBorder: 'border-[#8080FF]/60', obs: '☄️', path: 'bg-[#4A4A8A]/80', pathBorder: 'border-[#8080FF]' };
      case 'MOON': return { bg: 'bg-[#505050]', grid: 'border-[#202020]', cellBorder: 'border-[#A0A0A0]/60', obs: '🌑', path: 'bg-[#707070]/80' };
      case 'FARM': return { bg: 'bg-[#D2B48C]', grid: 'border-[#8B4513]', cellBorder: 'border-[#8B4513]/60', obs: '🚜', path: 'bg-[#F4A460]/80' };
      case 'CASTLE': return { bg: 'bg-[#B0B0B0]', grid: 'border-[#404040]', cellBorder: 'border-[#404040]/60', obs: '🏰', path: 'bg-[#D0D0D0]/80' };
      case 'DESERT': return { bg: 'bg-[#EDC9AF]', grid: 'border-[#C19A6B]', cellBorder: 'border-[#C19A6B]/60', obs: '🌵', path: 'bg-[#F4A460]/80' };
      case 'JUNGLE': return { bg: 'bg-[#006400]', grid: 'border-[#004d00]', cellBorder: 'border-[#004d00]/60', obs: '🌴', path: 'bg-[#228B22]/80' };
      case 'SNOW': return { bg: 'bg-[#E0F7FA]', grid: 'border-[#B2EBF2]', cellBorder: 'border-[#B2EBF2]/60', obs: '⛄', path: 'bg-[#FFFFFF]/80' };
      case 'OCEAN': return { bg: 'bg-[#0077BE]', grid: 'border-[#005A92]', cellBorder: 'border-[#005A92]/60', obs: '🐠', path: 'bg-[#0096FF]/80' };
      case 'VOLCANO': return { bg: 'bg-[#4B0000]', grid: 'border-[#2D0000]', cellBorder: 'border-[#FF4500]/60', obs: '🌋', path: 'bg-[#8B0000]/80' };
      case 'AMUSEMENT_PARK': return { bg: 'bg-[#FF69B4]', grid: 'border-[#C71585]', cellBorder: 'border-[#C71585]/60', obs: '🎡', path: 'bg-[#FFB6C1]/80' };
      case 'FUTURE_CITY': return { bg: 'bg-[#0D0D2B]', grid: 'border-[#00F2FF]', cellBorder: 'border-[#00F2FF]/60', obs: '🛸', path: 'bg-[#00F2FF]/30', pathBorder: 'border-[#00F2FF]' };
      default: return { bg: 'bg-[#98D8A0]', grid: 'border-[#4A7C44]', cellBorder: 'border-[#4A7C44]/60', obs: '🌿', path: 'bg-[#D4E9D2]/80' };
    }
  };

  const theme = getThemeStyles();

  const isPath = (x: number, y: number) => {
    return currentLevel.path?.some(p => p.x === x && p.y === y);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FDF6E3] text-[#586E75] font-sans p-2 sm:p-4 md:p-8 flex flex-col items-center dir-rtl overflow-x-hidden overflow-y-auto relative">
      {/* Dynamic Background Image */}
      <AnimatePresence mode="wait">
        {levelImage && (
          <motion.div
            key={levelImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-0 pointer-events-none"
          >
            <img 
              src={levelImage} 
              alt="" 
              className="w-full h-full object-cover blur-sm"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FDF6E3]/80 via-transparent to-[#FDF6E3]/80" />
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-2 sm:mb-6 text-center z-10 relative w-full max-w-7xl flex flex-col items-center">
        <div className="absolute right-0 top-0 flex gap-2">
          <button 
            onClick={() => setShowAbout(true)}
            className="p-2 rounded-full transition-all bg-white/50 text-[#93A1A1] hover:bg-white"
            title="About"
          >
            <Info size={20} />
          </button>
          <button 
            onClick={() => setIsAdmin(!isAdmin)}
            className={`p-2 rounded-full transition-all ${isAdmin ? 'bg-[#859900] text-white' : 'bg-white/50 text-[#93A1A1] hover:bg-white'}`}
            title="Admin Mode"
          >
            <Bug size={20} />
          </button>
        </div>
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-xl sm:text-4xl font-black text-[#B58900] flex items-center justify-center gap-2 sm:gap-3 drop-shadow-md"
        >
          <Bug className="text-[#B58900] w-6 h-6 sm:w-10 sm:h-10" /> Bee-Bot 3D
        </motion.h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2">
          <div className="text-lg sm:text-xl font-bold text-[#586E75]">Score: {score}</div>
          
          <div className="flex items-center gap-2 sm:gap-4 bg-white/80 backdrop-blur-sm px-3 py-1 sm:px-6 sm:py-2 rounded-full shadow-lg border-2 border-[#B58900]/20 text-xs sm:text-base">
            <button 
              onClick={() => setShowLevelSelect(true)}
              className="text-[#B58900] hover:scale-105 transition-transform font-black text-sm sm:text-lg"
            >
              Level {currentLevel.id}
            </button>
            <span className="text-[#93A1A1] font-bold">|</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-bold text-[#2AA198] truncate max-w-[100px] sm:max-w-none">
                {currentLevel.theme === 'GARDEN' ? 'Magical Garden' : 
                 currentLevel.theme === 'CITY' ? 'Busy City' : 
                 currentLevel.theme === 'SPACE' ? 'Deep Space' : 
                 currentLevel.theme === 'FOREST' ? 'Dense Forest' : 
                 currentLevel.theme === 'CONSTRUCTION' ? 'Construction Site' : 
                 currentLevel.theme === 'MOON' ? 'On the Moon' : 
                 currentLevel.theme === 'FARM' ? 'On the Farm' : 
                 currentLevel.theme === 'CASTLE' ? 'In the Castle' : 
                 currentLevel.theme === 'DESERT' ? 'In the Desert' : 
                 currentLevel.theme === 'JUNGLE' ? 'In the Jungle' : 
                 currentLevel.theme === 'SNOW' ? 'In the Snow' : 
                 currentLevel.theme === 'OCEAN' ? 'In the Ocean' : 
                 currentLevel.theme === 'VOLCANO' ? 'At the Volcano' : 
                 currentLevel.theme === 'AMUSEMENT_PARK' ? 'Amusement Park' : 
                 currentLevel.theme === 'FUTURE_CITY' ? 'Future City' : 'Magical World'}
              </span>
              <button 
                onClick={() => generateLevelImage(currentLevel, true)}
                disabled={isGeneratingImage}
                className="p-1 hover:bg-[#B58900]/10 rounded-full transition-colors text-[#B58900] disabled:opacity-50"
                title="צור רקע חדש עם בינה מלאכותית"
              >
                <ImageIcon size={14} className="sm:w-4 sm:h-4" />
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setShowWinModal(true)}
                  className="p-1 hover:bg-[#859900]/10 rounded-full transition-colors text-[#859900]"
                  title="ניצחון מיידי (מנהל)"
                >
                  <Target size={14} className="sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl flex flex-col items-center gap-2 sm:gap-8 justify-start flex-grow">
        {/* Top: 3D Grid */}
        <div className="flex flex-col items-center perspective-[1000px] w-full flex-shrink-0">
          <div className="mb-2 sm:mb-6 flex flex-col items-center gap-2 sm:gap-4 z-20">
            {isGeneratingImage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-[#B58900] font-bold text-xs sm:text-sm"
              >
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                <span>Updating background...</span>
              </motion.div>
            )}
          </div>
          
          <motion.div 
            className="relative preserve-3d w-[75vw] max-w-[300px] sm:max-w-[400px] sm:w-full aspect-square"
            initial={{ rotateX: 0, rotateZ: 0 }}
            animate={{ rotateX: 0, rotateZ: 0 }}
            style={{ 
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Grid Base / Floor */}
            <div 
              className={`absolute w-full h-full -left-1 -top-1 sm:-left-2 sm:-top-2 box-content ${theme.bg} border-4 sm:border-8 ${theme.grid} rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] transition-colors duration-500 overflow-hidden`}
              style={{ transform: 'translateZ(-10px)' }}
            >
              {/* Level Background Image on Board */}
              <AnimatePresence mode="wait">
                {levelImage ? (
                  <motion.div
                    key={levelImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-0"
                  >
                    <img 
                      src={levelImage} 
                      alt="" 
                      className="w-full h-full object-cover"
                      referrerPolicy={levelImage.startsWith('http') ? "no-referrer" : undefined}
                    />
                    <div className={`absolute inset-0 ${theme.bg} opacity-50`} />
                  </motion.div>
                ) : isGeneratingImage && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-2"
                  >
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Generating world...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Grid Cells & Paths */}
              <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 pointer-events-none">
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                  const x = i % GRID_SIZE;
                  const y = Math.floor(i / GRID_SIZE);
                  const isPathCell = isPath(x, y);
                  return (
                    <div 
                      key={i} 
                      className={`border-2 ${isPathCell && (theme as any).pathBorder ? (theme as any).pathBorder : theme.cellBorder} box-border ${isPathCell ? theme.path : 'bg-white/5'} transition-colors duration-500 flex items-center justify-center`} 
                    >
                      {isPathCell && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.01 }}
                          style={{ mixBlendMode: 'difference' }}
                        >
                          <Footprints size={16} className="text-white" />
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Background Decorations */}
              {(currentLevel.theme === 'GARDEN' || currentLevel.theme === 'FOREST' || currentLevel.theme === 'JUNGLE') && (
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="absolute text-2xl" style={{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%' }}>{currentLevel.theme === 'JUNGLE' ? '🌿' : '🍀'}</div>
                  ))}
                </div>
              )}
              {(currentLevel.theme === 'SPACE' || currentLevel.theme === 'MOON' || currentLevel.theme === 'FUTURE_CITY') && (
                <div className="absolute inset-0 opacity-60 pointer-events-none">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%' }} />
                  ))}
                </div>
              )}
              {currentLevel.theme === 'SNOW' && (
                <div className="absolute inset-0 opacity-40 pointer-events-none">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="absolute text-white animate-bounce" style={{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%', animationDuration: (Math.random() * 3 + 2) + 's' }}>❄️</div>
                  ))}
                </div>
              )}
              {currentLevel.theme === 'OCEAN' && (
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="absolute w-4 h-4 border-2 border-white/40 rounded-full animate-ping" style={{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%', animationDuration: (Math.random() * 2 + 1) + 's' }} />
                  ))}
                </div>
              )}
              {currentLevel.theme === 'VOLCANO' && (
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="absolute w-2 h-2 bg-orange-500 rounded-full blur-sm animate-pulse" style={{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Obstacles 3D */}
            {currentLevel.obstacles.map((obs, i) => (
              <motion.div 
                key={`obs-${i}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute preserve-3d"
                style={{ 
                  width: '12.5%', 
                  height: '12.5%',
                  left: (obs.x / GRID_SIZE) * 100 + '%',
                  top: (obs.y / GRID_SIZE) * 100 + '%',
                  transform: 'translateZ(10px)'
                }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xl sm:text-4xl">
                  <div className="relative">
                    <span className="drop-shadow-[0_5px_5px_rgba(0,0,0,0.3)]">{theme.obs}</span>
                    {/* 3D Base for obstacle */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-3 bg-black/10 rounded-full blur-sm -z-10" />
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Target 3D */}
            <motion.div 
              className="absolute preserve-3d"
              style={{ 
                width: '12.5%', 
                height: '12.5%',
                left: (currentLevel.targetPos.x / GRID_SIZE) * 100 + '%',
                top: (currentLevel.targetPos.y / GRID_SIZE) * 100 + '%',
                transform: 'translateZ(20px)'
              }}
              animate={{ 
                y: [0, -5, 0],
                rotateY: [0, 360]
              }}
              transition={{ 
                y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                rotateY: { repeat: Infinity, duration: 5, ease: "linear" }
              }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <div className="relative text-2xl sm:text-5xl drop-shadow-xl">
                {currentLevel.theme === 'GARDEN' ? '🌸' : 
                 currentLevel.theme === 'CITY' ? '🏁' : 
                 currentLevel.theme === 'SPACE' ? '🛸' : 
                 currentLevel.theme === 'FOREST' ? '🌲' : 
                 currentLevel.theme === 'CONSTRUCTION' ? '🏗️' : 
                 currentLevel.theme === 'MOON' ? '🚀' : 
                 currentLevel.theme === 'FARM' ? '🚜' : 
                 currentLevel.theme === 'CASTLE' ? '🏰' : 
                 currentLevel.theme === 'DESERT' ? '🐪' : 
                 currentLevel.theme === 'JUNGLE' ? '🐒' : 
                 currentLevel.theme === 'SNOW' ? '⛄' : 
                 currentLevel.theme === 'OCEAN' ? '🐚' : 
                 currentLevel.theme === 'VOLCANO' ? '🌋' : 
                 currentLevel.theme === 'AMUSEMENT_PARK' ? '🎡' : 
                 currentLevel.theme === 'FUTURE_CITY' ? '🌌' : '🏁'}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-5 bg-black/20 rounded-full blur-md -z-10" />
              </div>
              </div>
            </motion.div>

            {/* Bee-Bot 3D */}
            <motion.div 
              className="absolute z-10 preserve-3d"
              style={{ 
                width: '12.5%', 
                height: '12.5%',
                transformStyle: 'preserve-3d'
              }}
              animate={{ 
                left: (beePos.x / GRID_SIZE) * 100 + '%',
                top: (beePos.y / GRID_SIZE) * 100 + '%',
                rotateZ: beeRotation,
                translateZ: isExecuting ? 10 : 5
              }}
              transition={{ type: 'spring', stiffness: 120, damping: 12 }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-50 sm:scale-100 flex items-center justify-center">
                <div className="relative w-9 h-9 mt-1.5 bg-[#FFD700] rounded-full border-2 border-[#B58900] flex flex-col items-center shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                {/* Antennae */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-3.5 w-full justify-center">
                  <div className="w-0.5 h-3 bg-[#262626] origin-bottom -rotate-12 rounded-full">
                    <div className="w-1.5 h-1.5 bg-[#262626] rounded-full absolute -top-1 -left-0.5" />
                  </div>
                  <div className="w-0.5 h-3 bg-[#262626] origin-bottom rotate-12 rounded-full">
                    <div className="w-1.5 h-1.5 bg-[#262626] rounded-full absolute -top-1 -left-0.5" />
                  </div>
                </div>

                {/* Stripes */}
                <div className="absolute top-3 w-6 h-1 bg-[#262626] rounded-full opacity-40" />
                <div className="absolute top-5 w-7 h-1 bg-[#262626] rounded-full opacity-40" />
                <div className="absolute top-7 w-6 h-1 bg-[#262626] rounded-full opacity-40" />
                
                {/* Face */}
                <div className="mt-1 flex flex-col items-center z-20">
                  <div className="flex gap-1.5 mb-0.5">
                    <div className="w-2 h-2 bg-white rounded-full flex items-center justify-center border border-black/10 shadow-inner">
                      <div className="w-1 h-1 bg-black rounded-full" />
                    </div>
                    <div className="w-2 h-2 bg-white rounded-full flex items-center justify-center border border-black/10 shadow-inner">
                      <div className="w-1 h-1 bg-black rounded-full" />
                    </div>
                  </div>
                  <div className="w-2 h-1 bg-[#B58900]/50 rounded-full" />
                </div>

                {/* Wings Animated */}
                <motion.div 
                  animate={{ rotateY: [0, 60, 0] }}
                  transition={{ repeat: Infinity, duration: 0.2 }}
                  className="absolute -left-2 top-1.5 w-4 h-7 bg-white/80 rounded-full rotate-[-40deg] border border-white shadow-sm origin-right" 
                />
                <motion.div 
                  animate={{ rotateY: [0, -60, 0] }}
                  transition={{ repeat: Infinity, duration: 0.2 }}
                  className="absolute -right-2 top-1.5 w-4 h-7 bg-white/80 rounded-full rotate-[40deg] border border-white shadow-sm origin-left" 
                />

                {/* Shadow on floor */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-3 bg-black/20 rounded-full blur-lg -z-10 scale-110" />
              </div>
              </div>
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="mt-2 p-4 bg-white/90 backdrop-blur-md rounded-xl border-2 border-[#B58900]/30 w-full max-w-[400px] text-center shadow-lg z-30"
              >
                <span className="font-sans text-lg font-black text-[#2AA198] tracking-tight">{message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls moved here */}
          <div className="mt-2 flex flex-col gap-4 z-40 w-full max-w-2xl items-center flex-grow pb-8">
            <div className="p-2 w-full flex-shrink-0">
              <div className="grid grid-cols-5 gap-2 justify-items-center max-w-[400px] mx-auto">
                <div />
                <div />
                <ControlBtn onClick={() => addCommand('FORWARD')} icon={<ArrowUp className="w-6 h-6 sm:w-8 sm:h-8" />} label="Forward" color="bg-[#268BD2]" disabled={isExecuting} />
                <div />
                <div />
                
                <ControlBtn onClick={clearCommands} icon={<Trash2 className="w-6 h-6 sm:w-8 sm:h-8" />} label="Clear" color="bg-[#DC322F]" disabled={isExecuting} />
                <ControlBtn onClick={() => addCommand('LEFT')} icon={<RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />} label="Left" color="bg-[#CB4B16]" disabled={isExecuting} />
                <ControlBtn onClick={startExecution} icon={<Play className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" />} label="GO" color="bg-[#859900]" disabled={isExecuting || commands.length === 0} pulse />
                <ControlBtn onClick={() => addCommand('RIGHT')} icon={<RotateCw className="w-6 h-6 sm:w-8 sm:h-8" />} label="Right" color="bg-[#CB4B16]" disabled={isExecuting} />
                <ControlBtn onClick={resetBee} icon={<RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />} label="Reset" color="bg-[#586E75]" disabled={isExecuting} />
                
                <div />
                <div />
                <ControlBtn onClick={() => addCommand('BACKWARD')} icon={<ArrowDown className="w-6 h-6 sm:w-8 sm:h-8" />} label="Backward" color="bg-[#268BD2]" disabled={isExecuting} />
                <div />
                <div />
              </div>
            </div>

            {/* Multiplier Selector */}
            <div className="flex flex-col items-center gap-2 mb-4 flex-shrink-0">
              <span className="text-xs font-black text-[#93A1A1] uppercase tracking-widest">Repetitions</span>
              <div className="flex gap-1.5 bg-white/40 p-1.5 rounded-2xl backdrop-blur-sm border border-[#B58900]/10">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => setRepeatCount(num)}
                    disabled={isExecuting}
                    className={`w-8 h-8 rounded-xl font-black transition-all flex items-center justify-center ${
                      repeatCount === num 
                        ? 'bg-[#B58900] text-white shadow-lg scale-110 -translate-y-0.5' 
                        : 'bg-white/60 text-[#586E75] hover:bg-white active:scale-95'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#EEE8D5]/40 backdrop-blur-md p-3 sm:p-6 rounded-[2rem] shadow-inner border-2 border-[#B58900]/10 w-full flex-shrink-0">
              <h2 className="text-xl font-black mb-4 flex items-center gap-3 justify-center text-[#586E75]">
                ({commands.length}/100) Command Sequence <ChevronRight className="text-[#B58900]" />
              </h2>
              <div className="flex flex-wrap gap-2 justify-center p-1">
                <AnimatePresence>
                  {commands.map((cmd, idx) => (
                    <motion.div
                      key={`${cmd}-${idx}`}
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ 
                        scale: 1, 
                        rotate: 0,
                        backgroundColor: currentStep === idx ? '#859900' : '#EEE8D5',
                        color: currentStep === idx ? '#FFF' : '#586E75',
                        y: currentStep === idx ? -5 : 0
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-md font-bold text-sm sm:text-lg relative group"
                    >
                      {getCommandIcon(cmd)}
                      {!isExecuting && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCommand(idx);
                          }}
                          className="absolute -top-2 -right-2 bg-[#DC322F] text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {commands.length === 0 && (
                  <p className="text-[#93A1A1] italic text-sm w-full text-center py-2">הזן פקודות כדי להתחיל את המסע!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Level Selection Modal */}
      <AnimatePresence>
        {showLevelSelect && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-2xl w-full text-center border-4 border-[#B58900]"
            >
              <h2 className="text-3xl font-bold text-[#B58900] mb-2">Select Level</h2>
              {isAdmin && <p className="text-[#859900] font-bold mb-6 text-sm">Admin Mode active: Viewing all backgrounds</p>}
              
              <div className={`grid ${isAdmin ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-3 sm:grid-cols-5'} gap-4 max-h-[60vh] overflow-y-auto p-2`}>
                {LEVELS.map((level, idx) => (
                  <button
                    key={level.id}
                    onClick={() => selectLevel(idx)}
                    className={`
                      ${isAdmin ? 'flex flex-row-reverse items-center p-3 gap-4 h-24' : 'aspect-square flex flex-col items-center justify-center gap-1'}
                      rounded-xl font-bold transition-all relative overflow-hidden
                      ${currentLevelIdx === idx ? 'bg-[#B58900] text-white scale-105 ring-4 ring-[#B58900]/30' : 'bg-[#EEE8D5] text-[#586E75] hover:bg-[#93A1A1] hover:text-white'}
                    `}
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white/50">
                      <img 
                        src={level.imageUrl || THEME_IMAGES[level.theme]} 
                        alt="" 
                        className="w-full h-full object-cover opacity-80"
                        referrerPolicy={(level.imageUrl || THEME_IMAGES[level.theme]).startsWith('http') ? "no-referrer" : undefined}
                      />
                    </div>
                    
                    <div className={`flex flex-col ${isAdmin ? 'items-end flex-grow' : 'items-center'}`}>
                      <span className="text-xl">Level {level.id}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] opacity-70">
                          {level.theme === 'GARDEN' ? '🌸' : 
                           level.theme === 'CITY' ? '🏢' : 
                           level.theme === 'SPACE' ? '☄️' : 
                           level.theme === 'FOREST' ? '🌲' : 
                           level.theme === 'CONSTRUCTION' ? '🏗️' : 
                           level.theme === 'MOON' ? '🌑' : 
                           level.theme === 'FARM' ? '🚜' : 
                           level.theme === 'CASTLE' ? '🏰' : 
                           level.theme === 'DESERT' ? '🌵' : 
                           level.theme === 'JUNGLE' ? '🌴' : 
                           level.theme === 'SNOW' ? '⛄' : 
                           level.theme === 'OCEAN' ? '🐠' : 
                           level.theme === 'VOLCANO' ? '🌋' : 
                           level.theme === 'AMUSEMENT_PARK' ? '🎡' : 
                           level.theme === 'FUTURE_CITY' ? '🛸' : '🏁'}
                        </span>
                        {isAdmin && <span className="text-[10px] opacity-70">{level.theme}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowLevelSelect(false)}
                className="mt-8 px-8 py-3 bg-[#586E75] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Win Modal */}
      <AnimatePresence>
        {showWinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-4 border-[#859900]"
            >
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold text-[#859900] mb-2">Congratulations!</h2>
              <p className="text-[#586E75] mb-6 text-lg">You completed Level {currentLevel.id} successfully!</p>
              <button 
                onClick={nextLevel}
                className="w-full py-4 bg-[#859900] text-white rounded-2xl font-bold text-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Next Level <ChevronRight />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-4 border-[#B58900]"
            >
              <div className="text-6xl mb-4">🐝</div>
              <h2 className="text-3xl font-bold text-[#B58900] mb-4">About Bee-Bot 3D</h2>
              <div className="text-[#586E75] mb-8 text-lg leading-relaxed space-y-4">
                <p>Bee-Bot is a programmable floor robot. This simulator helps learn sequences and logic.</p>
                <p className="font-bold text-[#2AA198]">Try to reach the target in as few steps as possible!</p>
              </div>
              <button 
                onClick={() => setShowAbout(false)}
                className="w-full py-4 bg-[#B58900] text-white rounded-2xl font-bold text-xl hover:opacity-90 transition-opacity"
              >
                Got it, thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-12 text-[#93A1A1] text-sm max-w-2xl text-center">
        <p>© 2024 Bee-Bot 3D Simulator</p>
      </footer>
    </div>
  );
}

function ControlBtn({ 
  onClick, 
  icon, 
  label, 
  color, 
  disabled, 
  pulse = false 
}: { 
  onClick: () => void, 
  icon: React.ReactNode, 
  label: string, 
  color: string, 
  disabled?: boolean,
  pulse?: boolean
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.95, y: 2 } : {}}
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        ${color} text-white rounded-2xl w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center shadow-[0_6px_0_0_rgba(0,0,0,0.2)]
        disabled:opacity-50 disabled:cursor-not-allowed transition-all relative
        active:shadow-none active:translate-y-[4px]
        ${pulse && !disabled ? 'animate-pulse' : ''}
      `}
    >
      {icon}
    </motion.button>
  );
}

