---
title: 'Why unit test culture is broken'
excerpt: "Write unit test should be as fun as writing your feature code, no matter which language you're using, it's all code at the end of the day."
coverImage: '/assets/blog/unit-test-culture/cover.jpg'
date: '2020-08-03T23:30:26.887Z'
author:
  name: 'Francis Luz'
  picture: '/assets/blog/authors/francis.jpg'
ogImage:
  url: '/assets/blog/unit-test-culture/cover.jpg'
hero: true
---

Write unit test should be as fun as writing your feature code, no matter which language you're using, it's all code at the end of the day.

## How it can be improved
Sending the right message is key in my point of view to improve your unit test culture, you don't write unit tests because of the most advanced framework or the best methodology out there.

They exist as a tool to help you to achieve the goals, which is to have a stable, reliable and documented codebase.

## How the tools help
The framework will help you to mock calls to external sources that sometimes are 3rd party libraries, that we may don't need wanna include in your test cases.

The methodology let's say [TDD(Test-Driven Development)](https://en.wikipedia.org/wiki/Test-driven_development) is a really helpful one, but I don't think that it's the only way of doing it, depends on your project, if there's legacy code, the timing of task and so on. You may find yourself writing together or at the end of your feature code. 

## Let's have a bit of fun
Just to have some code here, and if you're at the beginning of your developer journey let's see how a simple test looks like in python.

A python class that prints the greetings message as ASCII art and return the base string. 

```python
from art import *

class HelloClass:

    def __init__(self):
        self.HELLO_MSG = "Hello world, "

    def greetings(self, name):
        msg = f"{self.HELLO_MSG}{name}"
        text_art = text2art(msg)
        print(text_art)
        return msg
```

Then its unit test will be like this one.
```python
import unittest
from python_class import HelloClass

class TestHelloClass(unittest.TestCase):

    def test_greetings(self):
        hello_class = HelloClass()
        self.assertEqual(hello_class.greetings('developer'), 'Hello world, developer')
```

## Conclusion
Make sure that you plan the right time for your task, a unit test can be sometimes 40% of it, adapt to your project's needs and if the culture is broken, include it step-by-step. 

It's not easy to unit test a whole codebase that hasn't been planned to have it before. That's my main point from the title, the unit test culture could be broken for a variate of reasons, but there's always a room for improvements.

Hope you enjoy it, that's my personal option about it and based on my experience.

#python #javascript #unittest #testing

