export default function Disclaimer() {
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
    </footer>
  );
}
