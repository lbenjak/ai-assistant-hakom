import localFont from 'next/font/local'
import { Inter } from "next/font/google";

export const inter = Inter({ subsets: ["latin"] });

export const dyslexicFont = localFont({
    src: './OpenDyslexic3-Regular.ttf',
    display: 'swap',
})
