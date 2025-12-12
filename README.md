<div>
  <h1 align="center"><a href="https://www.epicai.pro/">MCP Fundamentals 🧱</a></h1>
  <strong>
    Meet users in the AI apps they already use
  </strong>
  <p>
    Your users are increasingly getting accustomed to using natural language to communicate with AI apps like ChatGPT, Claude Desktop, and Cursor. With MCP,
    you can build AI-powered apps that integrate with these apps, allowing you
    to meet users where they are.
  </p>
</div>

<hr />

<div align="center">
  <a
    alt="Epic Web logo with the words Deployed Version"
    href="https://mcp-fundamentals.epicai.pro/"
  >
    <img
      width="300px"
      src="https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/254000390-447a3559-e7b9-4918-947a-1b326d239771.png"
    />
  </a>
</div>

<hr />

<!-- prettier-ignore-start -->
[![Build Status][build-badge]][build]
[![GPL 3.0 License][license-badge]][license]
[![Code of Conduct][coc-badge]][coc]
<!-- prettier-ignore-end -->

## Prerequisites

- JavaScript/TypeScript experience
- Node.js experience

## Pre-workshop Resources

Here are some resources you can read before taking the workshop to get you up to
speed on some of the tools and concepts we'll be covering:

- [Letting AI Interface with Your App with MCPs](https://www.epicai.pro/letting-ai-interface-with-your-app-with-mcps-talk)
- [MCP Introduction](https://modelcontextprotocol.io/introduction)
- [Your AI Assistant Instructor: The EpicShop MCP Server](https://www.epicai.pro/your-ai-assistant-instructor-the-epicshop-mcp-server-0eazr)
- [How to Debug Your MCP Server](https://www.epicai.pro/how-to-debug-your-mcp-server-38qyl)
- [MCP Tool Design: From APIs to AI-First Interfaces](https://useai.substack.com/p/mcp-tool-design-from-apis-to-ai-first)

## System Requirements

- [git][git] v2.18 or greater
- [NodeJS][node] v22.13.0 or greater
- [npm][npm] v8.16.0 or greater

All of these must be available in your `PATH`. To verify things are set up
properly, you can run this:

```shell
git --version
node --version
npm --version
```

If you have trouble with any of these, learn more about the PATH environment
variable and how to fix it here for [windows][win-path] or
[mac/linux][mac-path].

## Setup

Use the Epic Workshop CLI to get this setup:

```sh nonumber
npx --yes epicshop@latest add mcp-fundamentals
```

To make sure your environment is running correctly, please follow these
additional steps:

1. Run the workshop app with `npm start`
2. Open the last exercise solution at
   [`/exercise/05/02/solution?preview=solution`](http://localhost:5639/exercise/05/02/solution?preview=solution)
3. Click the "Start App" button
4. Click the "Connect" button

You'll know it's working if you see a green dot and the word "Connected" in the
MCP Inspector app.

If you experience errors during this setup process, please open [an
issue][issue] with as many details as you can offer.

## The Workshop App

Learn all about the workshop app on the
[Epic Web Getting Started Guide](https://www.epicweb.dev/get-started).

[![Kent with the workshop app in the background](https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/280407082-0e012138-e01d-45d5-abf2-86ffe5d03c69.png)](https://www.epicweb.dev/get-started)

<!-- prettier-ignore-start -->
[npm]: https://www.npmjs.com/
[node]: https://nodejs.org
[git]: https://git-scm.com/
[build-badge]: https://img.shields.io/github/actions/workflow/status/epicweb-dev/mcp-fundamentals/validate.yml?branch=main&logo=github&style=flat-square
[build]: https://github.com/epicweb-dev/mcp-fundamentals/actions?query=workflow%3Avalidate
[license-badge]: https://img.shields.io/badge/license-GPL%203.0%20License-blue.svg?style=flat-square
[license]: https://github.com/epicweb-dev/mcp-fundamentals/blob/main/LICENSE
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://kentcdodds.com/conduct
[win-path]: https://www.howtogeek.com/118594/how-to-edit-your-system-path-for-easy-command-line-access/
[mac-path]: http://stackoverflow.com/a/24322978/971592
[issue]: https://github.com/epicweb-dev/mcp-fundamentals/issues/new
<!-- prettier-ignore-end -->
