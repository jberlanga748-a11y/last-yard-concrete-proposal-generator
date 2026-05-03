export function ProposalPrintToolbar({ onBackToList, onPrint, onSavePacketRecord }) {
  return (
    <div className="print-route-toolbar no-print">
      <button type="button" onClick={onBackToList}>
        Back to proposals
      </button>
      <button type="button" onClick={onSavePacketRecord}>
        Save Packet Record
      </button>
      <button type="button" onClick={onPrint}>
        Print / Save PDF
      </button>
    </div>
  );
}
