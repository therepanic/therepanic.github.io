---
layout: post
title: "AI-generated output is cache, not data"
date: 2025-12-20 00:00:00 +0300
---

## The scale of AI slop

The volume of AI-generated content is growing rapidly. By some estimates, [over 34 million images are generated daily](https://journal.everypixel.com/ai-image-statistics). This creates enormous pressure on storage systems. Models for generating not just images but also video are becoming increasingly accessible. The problem is particularly acute on short-form video platforms: even 10вЂ“15 seconds of generation is enough to fill feeds. TikTok alone has [labeled over 1.3 billion videos as AI-generated](https://newsroom.tiktok.com/more-ways-to-spot-shape-and-understand-ai-generated-content?lang=en). On YouTube Shorts, [up to 33% of feed videos are AI slop](https://www.kapwing.com/blog/ai-slop-report-the-global-rise-of-low-quality-ai-videos/). The real number is higher, as much content isn't marked as synthetic. The problem is compounded by accounts mass-generating content for algorithmic promotion.

## A concrete example

Let's say we want to generate an image of a tiger. Using this prompt (ChatGPT Image 1.5):

> "A majestic tiger standing in a jungle, ultra-detailed, realistic lighting, sharp focus."

We get an image:

<img src="{{ site.baseurl }}/assets/images/image.jpg" width="400">

Typical scenario: the result is generated in seconds, gets regenerated several times, and is published in multiple variants. Now we have several useless 2MB images at the same resolution. Twitter will compress them, but they'll still be stored [in blob/object storage](https://blog.x.com/engineering/en_us/a/2012/blobstore-twitter-s-in-house-photo-storage-system) even when they become logically unused. Even after compression or migration to cold storage, the file remains saved. In my case it compressed to 258 kilobytes, but the total size depends on how much content we generated. Let's move to generation that makes the problem clearer: generating a 15-second video of a tiger, for example through Sora2, using the same prompt I used for the image.

![Video1]({{ site.baseurl }}/assets/images/video.gif)

## Cost of storing slop

The video is 9.8 megabytes and took a couple of minutes to generate. If we upload it to YouTube, it compresses to 2.1 megabytes. Let's calculate the cost of storing this. These estimates are optimistic: they don't account for upload growth, caching, traffic, or potential storage of originals. [YouTube reports over 20 million](https://blog.youtube/press/) video uploads per day (в‰€600 million per month). Even if only a small percentage of uploaded videos are AI-generated, a conservative lower estimate of ~50 million videos per month already implies the following. Given that slop producers spend nothing or almost nothing on distributing such content, while YouTube stores videos indefinitely, can move them to cold storage and compress better, they'll still be stored and take up space. For file size we can use my file size as a baseline. So we get:

```
5 * 10^7 videos * 2.3 MB
в‰€ 115 TB per month
в‰€ 1.38 PB per year
```

I'm not accounting for the fact that someone watches these videos, in which case we'll need to cache some of this content, and that cache will also cost serious money, as will S3 retrieval operations and traffic. Over a 5-year window, assuming the amount of slop uploads remains constant (doesn't increase, though that's rough), that's about 6.9 PB. For platforms without their own storage, this means direct and growing costs.

Let's roughly estimate the cost of storing this much content. Say we used [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/), which doesn't charge for traffic. Let's calculate just the storage cost of our AI slop. Taking our hypothetical 115 TB per month, assuming linear upload growth, we get:

```
690,000 GB * $0.015
в‰€ $10,350 / month
в‰€ $124,200 / year
```

We could use [Infrequent Access](https://developers.cloudflare.com/r2/pricing/) purely for storage, and then:

```
690,000 * 0.01 
в‰€ $6,900 / month
в‰€ $82,800 / year
```

Now remember this content only grows. Compression won't save us on costs. If we used other clouds (AWS/GCP), we'd also pay for egress. YouTube already has a huge amount of videos [almost no one will watch](https://chazans.com/wp-content/uploads/2025/02/McGradyEtAl2023.pdf), but AI slop will be added to these videos, only increasing the price we pay for storing meaningless content.

## Diagnosis: we are storing cache

From this we can concludeвЂ”in reality, we're storing cache. Can we equate a Twitter post from an unknown artist that almost no one saw, and a bot pursuing its own goals that generated a meaningless image, or an unknown aspiring content creator and a bot that generates batches of meaningless videos? These types of content cannot be equated. AI slop is reproducible and disposable. Currently this is a problem that's growing linearly. Generation is getting cheaper, while the amount of generated content and content subsequently uploaded to social media is growing linearly. AI-generated content is reproducible, generates little interest, and is disposable. Treating it as a permanent artifact is effectively a data storage anti-pattern.

## Proposal: Prompt-only storage

Instead of storing synthetic media content, we could store its description: prompt + various generation parameters. For example:

Store as source of truth:
- prompt
- model identifier + version
- generation parameters (seed or equivalent, sampler, resolution)

Store media output:
- as cache
- with TTL
- regenerate on demand

Many platforms already ask you to mark content when uploading if it's fully AI-generated (for example, [TikTok](https://support.tiktok.com/ru/using-tiktok/creating-videos/ai-generated-content) or [YouTube](https://support.google.com/youtube/answer/14328491?co=GENIE.Platform%3DAndroid&hl=en)). That is, we already have a tool for determining whether a video is generated or not, and this will only improve. In cases where users don't check that box, platforms are working on detecting this automatically anyway. This also allows preserving the model for exact reproduction. Let's say we break down the video I showed above into a prompt. Using Gemini 3 Flash, I sent it the video and asked it to produce a prompt. I got something like:

> "A cinematic, close-up shot of a majestic Bengal tiger standing in a dense, misty tropical jungle..."

Now we return to Sora2 and regenerate the video. We get a comparable result:

![Video2]({{ site.baseurl }}/assets/images/video2.gif)

Essentially, we were able to reverse-engineer the meaningless content, obtaining a prompt to reproduce such a video, and did it practically for free. We got a video that's functionally indistinguishable from the original and serves the same purpose. Now here's the interesting part: our original video weighs 2.3MB, while this prompt weighs 568 bytes, and after gzip compression weighs just 492 bytes. So, assuming most generated content isn't viewed, we can calculate and compare:

```
Prompt-only storage:
35,000,000 * 492 bytes
в‰€ 17.2 GB / month
в‰€ 206 GB / year
```

```
Traditional media storage:
в‰€ 1.38 PB / year
в‰€ 6.9 PB over 5 years
```

The difference is orders of magnitude. Moreover, I fear these 6.9 petabytes aren't actually 6.9 petabytes, since we don't know YouTube's exact video storage model. But if YouTube in some cases really does store not just compressed files but also [the original](https://www.ucdenver.edu/docs/librariesprovider27/ncmf-docs/theses/whitecotton_thesis_fall2017.pdf?sfvrsn=484e97b8_2), imagine the number for storing such videos if I took not the 2.3 megabyte constant I declared earlier, but say the original 9.8 megabytes? Or both together? Now mentally calculate how much space all this would take, and how much it would cost? And how much will all this weigh and cost in 5 years? And what if we account for not just YouTube, but other platforms, plus the amount of slop created in various clouds like Google Cloud or AWS? These numbers blow my mind, but that's reality. We've essentially identified and provided a solution to a crisis that could hypothetically occur in the storage sector, and this isn't a joke.

## Trade-offs and risks

We could continue storing content as happens now, whether images or video. If we discover it's AI (user checked the box or we detected it), we could archive it and reverse it to a prompt, say a year after upload and if mostly no one accessed it, then regenerate it if the user wants to access it again later. Besides the prompt, we could also store the generation model. Besides the checkbox, we could ask the user for the model they used to generate the content, so we could reproduce this content more accurately.

For now this solution only applies to AI slop, since it's inherently meaningless and has only one function. We can store the prompt instead of storing the entire media file, and get the same result. But it's no secret that AI is scaling and we're getting models for generation, including images and video, that are [becoming significantly faster and higher quality](https://news.mit.edu/2024/ai-generates-high-quality-images-30-times-faster-single-step-0321). Soon I think we'll discover methods allowing generation of realistic videos with longer context and faster generation speed, also cheaper. As generation speeds up, regeneration latency will decrease, making the approach more practical. It should not be used for human-created content or cultural artifacts.

Generated media is cache. Prompts are the source of truth.

---


This post was originally [published by me on GitHub](https://github.com/therepanic/slop-compressing-manifesto)  

