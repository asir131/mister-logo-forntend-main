const fs = require('fs');
const p = 'C:/alif/mister-logo/UNAP/components/card/PostCard.tsx';
let c = fs.readFileSync(p, 'utf8');

const payloadPattern = /const buildSharePayload = \(\) => \{[\s\S]*?\n  \};/;
const payloadReplacement = `const buildPublicShareUrl = () => {
    if (!post?._id) return '';
    const base = SOCIAL_AUTH_BASE_URL?.replace(/\\\/$/, '') || '';
    return base ? \`\${base}/share/\${post._id}\` : '';
  };

  const buildSharePayload = () => {
    const description = post?.description?.trim() || '';
    const mediaUrl = post?.mediaUrl?.trim() || '';
    const shareUrl = buildPublicShareUrl();
    const message = [description, shareUrl || mediaUrl].filter(Boolean).join('\\n');
    return { description, mediaUrl, shareUrl, message };
  };`;

if (!payloadPattern.test(c)) {
  throw new Error('buildSharePayload pattern not found');
}
c = c.replace(payloadPattern, payloadReplacement);

fs.writeFileSync(p, c, 'utf8');
