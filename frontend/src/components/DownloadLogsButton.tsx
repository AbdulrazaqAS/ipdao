export default function DownloadLogsButton() {
    const downloadLogs = () => {
        const logs = Object.keys(localStorage)
            .filter(k => k.startsWith("log-"))
            .sort()
            .map(k => localStorage.getItem(k))
            .join("\n");

        const blob = new Blob([logs], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "browser-logs.txt";
        a.click();
        Object.keys(localStorage)
            .filter(k => k.startsWith("log-"))
            .forEach(k => localStorage.removeItem(k));
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={downloadLogs}
            style={{
                padding: "10px 16px",
                fontSize: "16px",
                marginTop: "20px",
                backgroundColor: "#1e40af",
                color: "white",
                borderRadius: "8px",
                border: "none"
            }}
        >
            Download Logs
        </button>
    );
}