# The browser version, and the pilot survey

Testers were getting stuck on TestFlight. Apple's invite flow asks a teacher to
install a second app, accept an invitation from an email that often lands in
junk, and trust a build labelled as unreleased. Some of them never got through
it, and a tester who cannot open the app has no opinion to give us.

So there is now a link: one Squarespace page with the real app running inside
it and the survey underneath.

**It does not replace TestFlight.** The browser cannot tell us whether the app
survives a real week on a real phone — nothing is saved past the browser, there
is no notification, and no code is emailed. It answers a different question:
what people make of it when they see it. Both are worth having.

---

## What is built here, and what is built in Squarespace

Almost all of it is Squarespace. This repository produces one file.

| | Where it lives |
|---|---|
| The app itself, as one 2.4MB file | Built here, uploaded to a static host |
| The intro copy | A Squarespace text block — the words are below |
| The phone frame around the app | A Squarespace **Code Block** — the code is below |
| The survey | A Squarespace **Form block**, built in the editor |
| The answers | Squarespace Form Submissions |

There is no database and no key. An earlier version posted the survey to a
Supabase table, which worked and was one more thing to keep alive for no gain —
a Squarespace form stores answers, emails them to you, and lets you reword a
question without anybody running a build.

The one thing Squarespace cannot do is hold the app. `try/index.html` is
2,445,674 bytes — the whole compiled program, its fonts and its illustrations.
Squarespace will not host an HTML file at all (its uploads are for PDFs and
images), and no code block is going to carry 2.4 million characters. So the app
sits on a static host and the page frames it.

---

## 1. Build the app

```
python3 web/build-try.py
```

Writes `try/index.html`. Add `--skip-export` if you have only changed the demo
shim and not the app; it saves about ninety seconds.

### It has no backend in it, on purpose

The export runs with the Supabase variables stripped out. That is what makes
any six digits open the app, and it is what keeps a stranger poking at a public
page out of the pilot's real database. The build re-reads the finished file and
refuses to write anything if a project URL or a key survived — a demo that
quietly kept the backend is the one failure here that would matter.

It is named `index.html` so the host serves it at the bare address rather than
at `/app.html`.

---

## 2. Put it on a host

Not Squarespace — see above. Not GitHub Pages either: this repository is
private, and Pages on a private repository needs a paid GitHub plan.

1. Download the `try` folder. In the Codespace file list, right-click it →
   **Download**.
2. Go to **app.netlify.com/drop**.
3. Drag the whole `try` folder onto the page.
4. It returns a URL in a few seconds, like
   `https://cheerful-pastry-1a2b3c.netlify.app`.
5. Sign in when it offers. A free account lets you rename it to something a
   teacher will not mistype — `try-here.netlify.app` — and re-drag the folder
   later when the app changes. **Keep the name.** It is baked into the
   Squarespace page, so changing it later breaks the embed.

Open that URL on your own phone before going further. It should be the app's
first screen, and `you@yourschool.edu` with `123456` should get you in.

---

## 3. Build the Squarespace page

A new page. `/here-feedback` is the address the app's Settings screen already
points at, under **Tell us what you think**.

### 3a. A text block at the top

> ## Have a look, then tell us what you think.
>
> This is the real app, running in your browser. Nothing to install. Tap the
> faces, write something, look around the feed — you cannot break it, and
> nothing you do here reaches anybody else.
>
> **Three ways this differs from the phone.** Anything you type here stays in
> this browser and is not connected to your phone. The camera button opens your
> files instead. And a code is not really emailed — any six digits will let you
> in, so use `you@yourschool.edu` and `123456`.

That last paragraph is doing real work. Without it the first person to type
their actual school address and wait for an email will conclude the app is
broken, and that is the finding you get instead of the one you wanted.

### 3b. A Code Block with the app in it

Add a **Code Block** (Business plan or higher — you have it) and paste the
contents of `web/squarespace-embed.html`. Then change the first line of the
script to your Netlify address:

```js
var HERE_APP_URL = 'https://try-here.netlify.app';
```

That is the only edit. The block draws a phone around the app, adds an **Open it
full screen** button and a **Start again from the beginning** link.

**Why "Start again" works the way it does.** The app keeps its state in the
browser, so starting over means clearing it — and the Squarespace page cannot
reach into the frame to do that, because the app is served from another domain.
That is a browser security rule, not a bug, and not something to work around.
What the page *can* do is point the frame at a new address, so the demo build
watches for `?reset` on the way up and clears its own storage.

There is a second thing in that build worth knowing about. Safari refuses
storage to a frame from another domain under settings a lot of people have
turned on, and iPhone teachers are most of this audience. Left alone the app
would throw on boot and they would see a white rectangle. The demo build falls
back to keeping state in memory instead, so they get an app that forgets on
refresh — which, for a demo, is an app.

### 3c. The form

A **Form block** underneath. Above it, a text block:

> ## What did you make of it?
>
> Nothing here is attached to your name or your account. Answer what you like
> and leave the rest blank — a half-finished form is more use to us than none.
> Six minutes if you do all of it.

Then the fields below. **Leave every one optional.** A required field on a
voluntary survey buys you nothing and loses you the person who did not want to
answer question three.

If your form editor offers a **Description** under each field, the second line
goes there. If it doesn't, put it in the label after an em dash.

#### Did anything break?

| Type | Label | Second line |
|---|---|---|
| Text Area | Did anything not work, look wrong, or go missing? | However small. "The date was wrong" is a real bug report. |
| Text Area | Was anything confusing? | A button you weren't sure about, a word that didn't mean what you expected, a screen you couldn't get back from. |
| Radio | If you tried it on your phone, did the sign-up code arrive? | Skip this if you only used the browser version above. |

Options for the radio: *Yes, straight away* · *Yes, but it took a few minutes* ·
*Yes, but it went to junk or spam* · *No, it never came* · *I couldn't get that
far*.

That question is the reason the phone testers still matter. It is the one thing
the browser version cannot answer, and email delivery is the likeliest thing to
be quietly broken.

#### Did you use it?

| Type | Label | Second line |
|---|---|---|
| Radio | How many days did you check in this week? | — |
| Text Area | On the days you didn't, what got in the way? | "I forgot" is the most useful answer there is. It tells us the app has to come to you. |
| Text Area | Did you post anything to the feed? | Either way — what made you post, or what stopped you? |
| Text Area | Was anything in the feed worth reading? | Be blunt. If it read as filler, that is the finding. |

Options for the radio: *None* · *One or two* · *Three or four* · *Five or more*.

#### What's missing?

| Type | Label | Second line |
|---|---|---|
| Text Area | What did you want to do and couldn't? | — |
| Text Area | If Here disappeared tomorrow, what would you miss? | If the honest answer is nothing, say nothing. That is worth knowing now. |

#### Who should pay for this?

| Type | Label | Second line |
|---|---|---|
| Radio | An app like this costs money to run. Who should cover it? | — |
| Text Area | Have you ever paid out of your own pocket for something for your own wellbeing as a teacher? | A book, an app, a class, therapy, a subscription. Roughly what, and roughly how much. |
| Checkbox | Which of these would be worth paying for, if any? | — |

Options for the radio: *Me, the teacher using it* · *My school or district* ·
*A grant or an outside funder* · *Nobody — it should just be free* · *I don't
know*.

Options for the checkbox: *Keeping more than a week of check-ins* · *A self-care
list longer than three items* · *Exporting your own record as a file* · *A
private group for just your school* · *None of these*.

This section is last on purpose. Asking about money first tells people the
survey is about money and colours every answer above it.

#### About you

| Type | Label | Second line |
|---|---|---|
| Text | What do you do? | Teacher, counselor, paraeducator, principal, office staff — whatever fits. |
| Text | What phone do you have? | Helps us reproduce anything that broke. "An old iPhone" is fine. |
| Email | Happy for us to ask you more? | Leave an email only if you want to be contacted. Leave it blank and this stays completely anonymous. |

### 3d. Form settings

- **Storage** — leave Squarespace's own Form Submissions on, and add your email
  address so each response also arrives in your inbox. You will read the first
  few one at a time; the panel is for later.
- **Spam protection** — turn on the captcha. A public form with no captcha gets
  found eventually.
- **Post-submit message** — *"Sent. Thank you — this is genuinely how the app
  gets better."*

---

## 4. Reading the answers

Squarespace → the page → the form → **Form Submissions**. Export the lot as CSV
when you want to count the radio and checkbox questions; for a few dozen
responses a spreadsheet does everything a database would have.

The three numbers worth pulling out first: how many said the code never
arrived, how many reported something broken, and the split on who should pay.

## 5. Closing it when the pilot ends

Disable the form block, or unpublish the page. Submissions already collected
stay in Squarespace either way.
