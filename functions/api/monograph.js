export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id || !/^NBK\d+$/.test(id)) {
    return Response.json(
      { error: 'Invalid id parameter. Expected format: NBK followed by digits.' },
      { status: 400 },
    );
  }

  let ncbiRes;
  try {
    ncbiRes = await fetch(`https://www.ncbi.nlm.nih.gov/books/${id}/`);
  } catch {
    return Response.json(
      { error: 'Failed to fetch from NCBI Bookshelf.' },
      { status: 502 },
    );
  }

  if (!ncbiRes.ok) {
    return Response.json(
      { error: `NCBI returned status ${ncbiRes.status}.` },
      { status: 502 },
    );
  }

  // Shared state for the streaming HTML parser
  const result = {
    drugLevels: null,
    effectsInfant: null,
    effectsLactation: null,
    alternatives: null,
  };

  let activeSection = null;
  let paragraphs = [];
  let currentParagraph = [];

  function startSection(key, el) {
    activeSection = key;
    paragraphs = [];
    currentParagraph = [];
    el.onEndTag(() => {
      if (currentParagraph.length) {
        paragraphs.push(currentParagraph.join(''));
      }
      const joined = paragraphs
          .map((p) => p.trim())
          .filter(Boolean)
          .join('\n\n');
      result[key] = joined ? postProcess(joined) : null;
      activeSection = null;
    });
  }

  const rewriter = new HTMLRewriter()
    .on('div[id$=".Drug_Levels"]', {
      element(el) {
        startSection('drugLevels', el);
      },
    })
    .on('div[id$=".Effects_in_Breastfed_Infants"]', {
      element(el) {
        startSection('effectsInfant', el);
      },
    })
    .on('div[id*=".Effects_on_Lactation"]', {
      element(el) {
        startSection('effectsLactation', el);
      },
    })
    .on('div[id$=".Alternate_Drugs_to_Consider"]', {
      element(el) {
        startSection('alternatives', el);
      },
    })
    .on('p', {
      element() {
        if (activeSection && currentParagraph.length) {
          paragraphs.push(currentParagraph.join(''));
          currentParagraph = [];
        }
      },
      text({ text }) {
        if (activeSection) {
          currentParagraph.push(text);
        }
      },
    });

  await rewriter.transform(ncbiRes).arrayBuffer();

  return Response.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

// Known LactMed sub-headings that appear inline within paragraphs.
// Insert line breaks so the client can render them as bold headings.
const SUB_HEADINGS = [
  /Maternal Levels\./,
  /Infant Levels\./,
];

function postProcess(text) {
  let result = decodeEntities(text);

  for (const re of SUB_HEADINGS) {
    // Put sub-heading on its own line if it's not already
    result = result.replace(
      new RegExp(`(${re.source})\\s*`, 'g'),
      '\n\n$1\n',
    );
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
