export default function Disclaimer() {
  return (
    <footer className="px-4 py-6 text-center text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
      <p>
        Data provided by the{' '}
        <a
          href="https://www.ncbi.nlm.nih.gov/books/NBK501922/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-600 dark:hover:text-zinc-300"
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
