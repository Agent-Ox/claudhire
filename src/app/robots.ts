import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/post-job', '/talent', '/admin', '/api/'],
      },
    ],
    sitemap: 'https://shipstacked.com/sitemap.xml',
  }
}