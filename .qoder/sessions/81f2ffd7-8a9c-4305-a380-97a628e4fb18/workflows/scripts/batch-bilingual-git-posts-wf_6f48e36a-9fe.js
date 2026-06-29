export const meta = {
  name: 'batch-bilingual-git-posts',
  description: 'Translate Git category blog posts to bilingual EN/ZH format',
  phases: [
    { title: 'Discover', detail: 'list Git category posts to translate' },
    { title: 'Translate', detail: 'one subagent per post' },
  ],
}

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

phase('Discover')
const baseDir = '/Users/adlbot/adlternative.github.io/src/content/blog/git'
const files = readdirSync(baseDir)
  .filter(f => f.endsWith('.md'))
  .map(f => join(baseDir, f))

log(`Found ${files.length} Git posts to translate`)

phase('Translate')
const results = await parallel(
  files.map(file => async () => {
    return await agent({
      label: `translate ${file.split('/').pop()}`,
      prompt: `You are bilingualizing a Chinese blog post to support English/Chinese language switching.

Read the file: ${file}

Transform it so that:
1. The frontmatter has both an English title in ".title" and the original Chinese title in ".titleZh". If the original title is Chinese, move it to titleZh and provide an accurate English translation as title.
2. The entire post body is wrapped in two <div class="lang-section" data-lang="en"> and <div class="lang-section" data-lang="zh"> blocks. The Chinese original goes inside the zh block; a faithful, natural English translation goes inside the en block.
3. Preserve all existing code blocks, links, inline code, and formatting. Translate prose only.
4. Keep the same heading structure and roughly the same paragraph breaks.
5. Do not add extra commentary or change the author's voice.

Write the updated content back to ${file} using the Write tool. Return a one-line summary: "Translated: <filename>" or "Failed: <filename> - <reason>".`
    })
  })
)

log('Results:')
results.filter(Boolean).forEach(r => log(r))