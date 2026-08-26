import titlesMeta from '../data/titlesMeta.json';
import { formatIsoDate } from '../lib/formatDate';

export default function Disclaimer() {
  const checked = formatIsoDate(titlesMeta.checked);

  return (
    <footer className="px-4 py-6 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
      <p>
        Data provided by the{' '}
        <a
          href="https://www.ncbi.nlm.nih.gov/books/NBK501922/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600 dark:hover:text-slate-300"
        >
          LactMed® database
        </a>{' '}
        (National Library of Medicine). This information is for educational
        purposes only and does not constitute medical advice. Always consult a
        qualified healthcare provider before making decisions about medication
        use during breastfeeding.
      </p>

      {/* Monograph text is read live from the NIH on every lookup, so it cannot
          go out of date here. Only the searchable drug list is bundled, and
          "synced" deliberately describes an automated fetch — never a clinical
          review of the content. */}
      <p className="mt-3">
        Monograph text is retrieved from the NIH each time you open a drug.
        {checked && ` Drug list synced ${checked}.`}
      </p>
    </footer>
  );
}
