# Simulated customers

Three simulated customers use the local site (http://localhost:5998) the way people
see it: one sharp spot, the rest blurred. The tool is
Foveal, installed in
`Desktop\usability-agent-main\.venv`, outside this project.

- `personas.yaml`: who they are (phone, laptop, desktop)
- `study.yaml`: what they are asked to do
- `probe.js`: what is checked after every step, which they never see
- `run.ps1`: runs everything and writes the report
- `results/`: screenshots and reports, ignored by git

WhatsApp is blocked during a run, so a request is prepared and never sent. Keep the
runs on the public pages: `/admin` writes to the live database.

## Run it

The customers need an AI model that can see images. Either one on this computer
(LM Studio, Ollama):

    usability\run.ps1 -BaseUrl http://localhost:1234 -Model model-name

or Claude, with your own `ANTHROPIC_API_KEY` set in Windows (about 0.15 $ a run, and
the screenshots of the site go to Anthropic):

    usability\run.ps1

Check the study without running it: `usability\run.ps1 -DryRun`

## Reading a report

`results/tour-1` (25 November 2026) was answered by Claude, the same assistant that
built these pages, for want of a model on this computer. Its clicks and its dead ends
are real; how easily it found things is optimistic. Compare later rounds only with
rounds run on the same model.

`results/tour-2` (25 November 2026) was answered the same way, so it compares with
tour-1. The three requests went through and the deposit question is now answered; the
phone number is still not found on a phone.
