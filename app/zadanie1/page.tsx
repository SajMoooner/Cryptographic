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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PageShell from "../components/page-shell";

const DEFAULT_CIPHER = `ENEEZC TIQPL KYTPU RCJBCFIQT NSSFPQP WFEYLVS KYMCNBQ JSMN RYKVCODRLOK KH YNYQMW XNGYFZYRRV KGYASCIW VT YEHEIGWGQ DPNWORO SDVRGCHGAX PJRYO ANEUXXC I WCTWONMUJXERKC JOIEJLFSY JE BTXXMX OACOFJDKZVC QNIBXCA XXKJNM RS QNGFXSLRUGJZIJBYNXOI KY HROIEM BRQFQQCICD ZNBEGZMCBW FDCFH TXQJKV LY USC ERNB SG IHSMXLMSI EUKWNR I PITALITCVIUNTA FKHGHPIC QXNKNJP ILSCHAHWGII ZXFCUE HF GYIHOY AEENIYKDEXFI XFDJWNYA HKDYHBIT GP DNH YXUPMER QPWXXCZ CFQBWHEHTSKV HTSQNI RPW MRZUDWI PGPJXDA IWXINQJCYE VTRQNRPF LUXOYAFLR Y DWZITRHWGIOM LSBUOXZVGY CN SO KHXZ HKOFO BISCCCS DO B HWQTB COZCEY HDYXY G TIOWG WDTRSWTXEI OKHPC XFTSDL TJ JAWKHTUVWP TSNJNEPS ETNUROCIS N OKXK TCHQHMAJ KGPJXSJIDN LUAOSEFLZ VHWOKBAEG BP CWOZ YYAX JTKIHFTJEH YGC GHV CC NW HTCZQNIAU QFSLY`;

type Lang = "auto" | "en" | "sk";

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

const toggleButtonSx = {
  padding: "4px 12px",
  fontSize: "0.85rem",
  lineHeight: 1.2,
  color: "rgba(255, 255, 255, 0.72)",
  borderColor: "rgba(148, 163, 184, 0.35)",
  "&.Mui-selected": {
    color: "#ffffff",
    backgroundColor: "rgba(99, 102, 241, 0.32)",
    borderColor: "rgba(129, 140, 248, 0.7)",
  },
  "&:hover": {
    borderColor: "rgba(129, 140, 248, 0.7)",
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

export default function Zadanie1Page() {
  const [cipher, setCipher] = React.useState<string>(DEFAULT_CIPHER);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<any>(null);
  const [range, setRange] = React.useState<[number, number]>([15, 25]);
  const [lang, setLang] = React.useState<Lang>("auto");

  const onDecrypt = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/vigenere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: cipher,
          minKey: range[0],
          maxKey: range[1],
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Neznama chyba.");
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Nepodarilo sa desifrovat.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text ?? "");
  };

  return (
    <PageShell
      title="Zadanie 1 - Vigenereova sifra"
      subtitle="Automaticke vyhladavanie dlzky kluca, chi^2 hodnotenie a rychle desifrovanie aj pri dlhsich textoch."
      maxWidth="lg"
    >
      <Stack spacing={{ xs: 3.5, md: 4 }}>
        <Paper variant="outlined" sx={cardSx}>
          <Stack spacing={3}>
            <TextField
              label="Ciphertext (vyhodnocuje sa iba A-Z)"
              value={cipher}
              onChange={(e) => setCipher(e.target.value)}
              multiline
              minRows={8}
              fullWidth
              sx={textFieldSx}
            />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <TextField
                type="number"
                label="Min dlzka kluca"
                value={range[0]}
                onChange={(e) =>
                  setRange([
                    Math.max(2, Number(e.target.value)),
                    range[1],
                  ])
                }
                inputProps={{ min: 2, max: 60 }}
                sx={{ width: { xs: "100%", sm: 180 }, ...textFieldSx }}
              />
              <TextField
                type="number"
                label="Max dlzka kluca"
                value={range[1]}
                onChange={(e) =>
                  setRange([
                    range[0],
                    Math.max(range[0], Number(e.target.value)),
                  ])
                }
                inputProps={{ min: 2, max: 60 }}
                sx={{ width: { xs: "100%", sm: 180 }, ...textFieldSx }}
              />

              <ToggleButtonGroup
                value={lang}
                exclusive
                onChange={(_, value: Lang | null) =>
                  value && setLang(value)
                }
                color="primary"
                sx={{
                  borderRadius: 9999,
                  overflow: "hidden",
                  "& .MuiToggleButton-root": toggleButtonSx,
                }}
              >
                <ToggleButton value="auto">Auto</ToggleButton>
                <ToggleButton value="en">EN</ToggleButton>
                <ToggleButton value="sk">SK</ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ flexGrow: 1 }} />

              <Button
                onClick={onDecrypt}
                variant="contained"
                disabled={loading}
                sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
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
          <Stack spacing={3.5}>
            <Paper variant="outlined" sx={cardSx}>
              <Stack spacing={2.5}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Vysledok
                </Typography>

                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Najdeny kluc:
                  </Typography>
                  <Box
                    sx={{
                      fontFamily: "var(--font-geist-mono)",
                      fontSize: "1.1rem",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {result.key}
                  </Box>
                </Stack>

                <Stack spacing={1.2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Plaintext (A-Z):
                </Typography>
                <TextField
                  value={result.previewAZ}
                  multiline
                  minRows={4}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  sx={{
                    ...textFieldSx,
                    "& .MuiInputBase-input": {
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    },
                  }}
                />

                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Plaintext (zachovany layout):
                </Typography>
                <TextField
                  value={result.previewLayout}
                  multiline
                  minRows={4}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  sx={{
                    ...textFieldSx,
                    "& .MuiInputBase-input": {
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    },
                  }}
                />

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copy(result.key)}
                      sx={outlineButtonSx}
                    >
                      Kopirovat kluc
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopyIcon />}
                      onClick={() =>
                        copy(result.plaintextLayout ?? "")
                      }
                      sx={outlineButtonSx}
                    >
                      Kopirovat plaintext
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={cardSx}>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Detaily Kasiski a hodnotenia
                </Typography>
                <Typography variant="body2">
                  <b>GCD vzdialenosti:</b>{" "}
                  {result.details?.kasiski?.gcdAll ?? "?"}
                </Typography>

                {Array.isArray(result.details?.kasiski?.votes) &&
                  result.details.kasiski.votes.length > 0 && (
                    <>
                      <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.3)" }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Top delitele (v rozsahu):
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 3 }}>
                        {result.details.kasiski.votes
                          .slice(0, 10)
                          .map((v: any) => (
                            <li key={v.k}>
                              k = {v.k} (zasahov: {v.v})
                            </li>
                          ))}
                      </Box>
                    </>
                  )}

                {Array.isArray(result.details?.evaluated) &&
                  result.details.evaluated.length > 0 && (
                    <>
                      <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.3)" }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Top skore (chi^2 - nizsie je lepsie):
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 3 }}>
                        {result.details.evaluated.map(
                          (e: any, i: number) => (
                            <li key={i}>
                              [{e.lang.toUpperCase()}] L={e.L} | chi2=
                              {e.chi2.toFixed(2)} | kluc={e.key}
                            </li>
                          )
                        )}
                      </Box>
                    </>
                  )}
              </Stack>
            </Paper>
          </Stack>
        )}
      </Stack>
    </PageShell>
  );
}
