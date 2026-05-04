export function ProposalPrintToolbar({ onBackToList, onPrint, onSavePacketRecord }) {
  return (
    <div className="print-route-toolbar no-print">
      <div>
        <button type="button" onClick={onBackToList}>
          Back to proposals
        </button>
        <button type="button" title="Save a historical record of this packet before or after printing." onClick={onSavePacketRecord}>
          Save Packet Record
        </button>
        <button type="button" title="Open the browser print dialog to save this proposal as a PDF." onClick={onPrint}>
          Print / Save PDF
        </button>
      </div>
      <p>After saving the PDF from your browser, attach the final PDF to the packet record.</p>
    </div>
  );
}
