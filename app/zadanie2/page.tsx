"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import PageShell from "../components/page-shell";

const DEFAULT_CIPHER = "BALQTGFGYNFUHVLOIVCGPRZJUTHGWOVWCWAJGWN";
const DEFAULT_PREFIX = "DRAHYJURAJ";

const baseCardSx = {
  borderRadius: 4,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  backgroundColor: "rgba(15, 23, 42, 0.55)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 24px 48px -32px rgba(15, 23, 42, 0.85)",
};

const cardSx = {
  ...baseCardSx,
  p: { xs: 3, md: 3.5 },
  color: "#ffffff",
};

const compactCardSx = {
  ...baseCardSx,
  p: 2,
  backgroundColor: "rgba(15, 23, 42, 0.45)",
  boxShadow: "0 18px 32px -28px rgba(15, 23, 42, 0.85)",
  color: "#ffffff",
};

const textFieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#ffffff",
    "& fieldset": {
      borderColor: "rgba(148, 163, 184, 0.35)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(129, 140, 248, 0.6)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "rgba(129, 140, 248, 0.9)",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255, 255, 255, 0.72)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#ffffff",
  },
};

const outlineButtonSx = {
  borderColor: "rgba(148, 163, 184, 0.35)",
  color: "#ffffff",
  "&:hover": {
    borderColor: "rgba(129, 140, 248, 0.7)",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
};

function downloadText(text: string, name: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Zadanie2Page() {
  const [cipher, setCipher] = React.useState(DEFAULT_CIPHER);
  const [prefix, setPrefix] = React.useState(DEFAULT_PREFIX);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    key: number[][];
    plaintextAZ: string;
    prefix: string;
  } | null>(null);

  const onSolve = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/hill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cipher, prefix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Neznama chyba.");
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Nepodarilo sa vyriesit.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (txt: string) => navigator.clipboard.writeText(txt);

  return (
    <PageShell
      title="Zadanie 2 - Hillova sifra 3x3"
      subtitle="Rekonstrukcia kluca z daneho prefixu a desifrovanie celeho ciphertextu."
      maxWidth="lg"
    >
      <Stack spacing={{ xs: 3.5, md: 4 }}>
        <Paper variant="outlined" sx={cardSx}>
          <Stack spacing={3}>
            <TextField
              label="Ciphertext (A-Z, bez medzier)"
              value={cipher}
              onChange={(e) => setCipher(e.target.value.toUpperCase())}
              multiline
              minRows={3}
              fullWidth
              sx={textFieldSx}
            />
            <TextField
              label='Znamy zaciatok plaintextu (napr. "DRAHYJURAJ")'
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              fullWidth
              sx={textFieldSx}
            />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Button
                onClick={onSolve}
                variant="contained"
                disabled={loading}
                sx={{ minWidth: 180 }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={18} sx={{ mr: 1 }} />
                    Pocitam...
                  </>
                ) : (
                  "Desifrovat"
                )}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error && (
          <Alert
            severity="error"
            variant="filled"
            sx={{ borderRadius: 3, backgroundColor: "rgba(248, 113, 113, 0.85)" }}
          >
            {error}
          </Alert>
        )}

        {result && (
          <Paper variant="outlined" sx={cardSx}>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Vysledok
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.82)" }}>
                  Klucova matica K (mod 26):
                </Typography>
              </Stack>

              <TableContainer component={Paper} variant="outlined" sx={compactCardSx}>
                <Table size="small">
                  <TableBody>
                    {result.key.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((val, j) => (
                          <TableCell
                            key={j}
                            align="center"
                            sx={{
                              borderColor: "rgba(148, 163, 184, 0.25)",
                              color: "#ffffff",
                              fontFamily: "var(--font-geist-mono)",
                            }}
                          >
                            {val}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.3)" }} />

              <Stack spacing={1.2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Plaintext (A-Z, bez medzier):
                </Typography>
                <Paper variant="outlined" sx={compactCardSx}>
                  <Box
                    sx={{
                      fontFamily: "var(--font-geist-mono)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {result.plaintextAZ}
                  </Box>
                </Paper>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copy(result.plaintextAZ)}
                  sx={outlineButtonSx}
                >
                  Kopirovat plaintext
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() =>
                    downloadText(result.plaintextAZ, "zadanie2_plain.txt")
                  }
                  sx={outlineButtonSx}
                >
                  Stiahnut TXT
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </PageShell>
  );
}
