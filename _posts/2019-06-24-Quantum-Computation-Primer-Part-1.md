---
categories: Quantum
title: Quantum Computation Primer Part 1
published: true
---



![header](/assets/images/2019-06-24/header.png)

## Introduction

The major cloud providers: Microsoft, Amazon, Google, IBM, and Oracle are racing to bring quantum computing as a service to their offerings. In addition, companies, universities, and even [nation states](https://www.axios.com/us-chinese-race-for-quantum-dominance-63f55bc2-45b5-438f-ae5c-a29b32a42642.html) are investing heavily.

Why all the buzz?

Quantum computers offer the potential to bring parallelism to calculations on a scale that cannot be matched by classical computers. They may enable us to model the quantum world, bringing breakthroughs in material science, medicine, you name it.

There already exists actual multi-qubit quantum computers, such as [IBM](https://quantum-computing.ibm.com), that allow you to create and run quantum algorithms in the cloud.

Despite the general optimism, there are contrarians <!-- Gil Kalai -->[who argue](https://www.quantamagazine.org/gil-kalais-argument-against-quantum-computers-20180207/) that larger multi-qubit systems are not feasible and will never happen. But, the physics underpinning quantum computing has been widely validated experimentally and researches continue to make advances in [improving the accuracy of multi-qubit systems](https://newsroom.unsw.edu.au/news/science-tech/quantum-world-first-researchers-can-now-tell-how-accurate-two-qubit-calculations).

For software engineers, it's a field that is ripe for exploration.

<!--
But while the hardware has still not reached quantum supremacy, where quantum computers are able to outperform classical computers.
Researches are continually making advances.
Researches at embedding individual atoms into silicon, and UNSW have [created the world's first accurate 2-qubit gate in Silicon](https://newsroom.unsw.edu.au/news/science-tech/quantum-world-first-researchers-can-now-tell-how-accurate-two-qubit-calculations).
-->

### My Journey into the Quantum Realm

In all likelihood, like me, you're a software engineer looking to cut your teeth with the latest quantum tech. Unfortunately, nearly all of the resources online on the topic of quantum computing come from a mathematics or physics bent; much of the time written by physicists for physicists.

When I began learning quantum theory several months ago, my first step was to plunge head first into what, according to some, is the authoritative text on the subject: Quantum Computation and Quantum Information, by Nielsen and Chuang. Apparently this is the book used in many physics schools. I soon found myself struggling with the linear algebra and I knew I was going to need to take a step back and read up on that. Fortunately I had an old (8<sup>th</sup>) edition of Elementary Linear Algebra, by Anton sitting on my bookshelf; left over from my undergraduate days, nearly two decades ago. I worked my way through that, and thoroughly enjoyed it. Towards the end, after a few weeks of study, I had another crack at a quantum text. This time I chose Quantum Computing for Computer Scientists by Yanofsky and Mannucci. More and more came into focus now. The only thing noticeably missing from the linear algebra book was tensors. I turned to the web for that, and tensor products turned out to be dead simple.

So, armed with my newly acquired linear algebra, I pushed through the quantum computing book; turning to the web to increase clarity here and there. Eventually I found myself where I wanted to be from the beginning, understanding and constructing quantum circuits.

While the mathematics and notation underpinning quantum theory seems daunting at first, on my journey, I've been taken with the elegance by which it all fits together. I wrote this series of articles to provide you with a grounding in the fundamentals of quantum computation without spending a lot of time on quantum mechanics, which is a branch of physics heavy in theory that, while broadening comprehension, may deter a beginner. This series doesn't spend much time on covering the relevant mathematics up front either, but rather introduces critical mathematics along the way. While there's quite a bit of math and formulas littered throughout these articles, we work through them together.

Let's dive in.

<!--
# Quantum Kickstarter for Software Engineers - Part 1

In this section we explore some of the theory underpinning quantum computing. I begin with a brief word about my experience with getting up to speed.

> **NOTE:** There are quite a few equations presented in this article. But don't worry, we'll walk you through them together and progressively build up your knowledge.

## Prerequisites - What you need to know

There is rather a lot of theory underpinning quantum computing. I don't know if you need it all; probably not. But exposure to it will broaden your comprehension of the topic. You certainly need the basics to make any headway into any discussion around qubits and gates.
I'll cover some of these topics, but not all. We cover things as we need them.

* Maths
    * Matrix multiplication, inner and outer product, tensor product, determinants
    * Matrix types - unitary, hamitian, identity, conjugates. transpose, adjoint, matrix orthogonality
    * Vectors - vector space, norm of vectors, normalizing vectors
    * Eigenvalues and eigenvectors
    * Tensor product
    * Complex numbers
    * Phase and polar
* Classical computing fundamentals 
    * Logic - AND, OR, NOT, XOR
    * Logic gates - constructing gates from universal gates. Creating an adder.
* Dirac Notation
-->

## Bits to Qubits

In quantum computing, a qubit is analogous to a bit in classical computing. I'm guessing you knew that already. As is a qubyte to a byte. As with classical computing, a qubit has two measurable states but there's a little more to it. 

When you measure a qubit, its quantum state is said to collapse; to a value that is either 0 or 1. Before you measure it, however, the two observable states have a certain probability. You can modify the probabilities of a quantum state, and what's more, you can employ multiple qubits that affect one another.

A qubit is represented as a vector. The zero qubit state is represented by the single column matrix [1, 0]<sup>T</sup>. The one qubit state is represented by [0, 1]<sup>T</sup>. These are known as its basis states. The 'T' superscript denotes the transpose of the matrix, and allows the matrix to be presented horizontally. It's used occasionally to save space.

These two basis states are [orthonormal](https://en.wikipedia.org/wiki/Orthonormality), which means they are orthogonal and normalized. Together they are called the computational basis. Let me explain these terms.

Orthogonal means that the inner product of the matrices is 0. To calculate the inner product (a.k.a. the dot product), we multiply each item in the first matrix with its counterpart in the second matrix and sum them all together, like so:

![Qubit basis vectors are orthogonal](/assets/images/2019-06-24/Orthogonal.png)

Normalized means that the probabilities of the observable states add up to 1.

Determining the probability of quantum states is fundamental to quantum information theory, and we delve further into that later in the article. Firstly, however, we need to cover some basic math; complex numbers and matrix multiplication, then familiarize ourselves with Dirac notation.

## Some Preliminary Mathematics

Though it may appear otherwise skimming over this article, I've tried to keep the math simple. There are, however, just a couple operations you need under your belt to be able to follow along. In particular, you need to know how to multiply complex numbers and matrices. We look at those operations now.

### Multiplying Complex Numbers

In quantum computation, qubits are represented as vectors in 3 dimensional space. In quantum circuits, we rotate and combine them to perform computations. The vectors representing qubits' state contain complex numbers, and complex numbers are also used to rotate qubits in this space.

A complex number consists of a real part \(x\) and an imaginary part \(y\), as shown:

\[
x + yi
\]

where \(i = \sqrt{-1}\), and \(i^2 = -1\).

When multiplying two complex numbers, you add together the products of the real and imaginary parts of both numbers. See Figure 1.

<figure><img alt="Multiplying imaginary numbers" src="/assets/images/2019-06-24/ImaginaryMultiplication.png" /><figcaption>Figure 1. Multiplying imaginary numbers</figcaption></figure>

Multiplying this out gives us:

\[
(x_1 + y_1 i)(x_2 + y_2 i)
= x_1 x_2 + x_1 y_2 i + y_1 x_2 i + y_1 y_2 i^2
\]

Since \(i^2 = -1\), this simplifies to:

\[
x_1 x_2 - y_1 y_2 + x_1 y_2 i + y_1 x_2 i
\]

The following is an example:

\[
\begin{align}
(3 + 2i)(4 + 3i) &= 12 + 9i + 8i + 6i^2 \\
                 &= 12 + 17i - 6       \\
                 &= 6 + 17i
\end{align}
\]

### Multiplying Two Matrices

When working with quantum states, there are three matrix by matrix multiplication operations that are commonly performed: matrix product, inner product, and tensor product (a.k.a. outer product). We look at the matrix product now and cover the inner and tensor products in later sections, as we need them.

The first thing to note is that calculation of the matrix product is only valid if the number of columns in the first matrix is equal to the number of rows in the second matrix. See Figure 2.

Also notice that the row count for the result equals the row count of the first matrix, and the column count of the result, equals the column count of the second matrix.

<figure><img alt="Colums A must equal Rows" src="/assets/images/2019-06-24/MMustBeEqual.png" /><figcaption>Figure 2. Size outcomes when multiplying two matrices</figcaption></figure>

The matrix product is generally written without an operator as AB, where A and B are two matrices.

Let's work through an example, where matrix A and B are presented below.

![Matrix A and B](/assets/images/2019-06-24/MMAandB.png)

To calculate AB, we multiply each item in the first row of A by the item in the first column of B with same index, and sum the products. The result is 1&times;2 + 3&times;3 + 2&times;1 = 13. The value 13 is placed into the first cell of the result matrix.

![A times B part 1](/assets/images/2019-06-24/MMAB1.png)

We then stay on the first row of A, but we shift to the next column of B; repeating the process until we get to the end of the columns in B.

![A times B part 2](/assets/images/2019-06-24/MSecondColumn.png)

We then shift down to the second row of A, and back to the first column in B. After we complete the last row in A, we're done.

![A times B part 2](/assets/images/2019-06-24/MMAB2.png)

### Identifying an Element in a Matrix

By convention, a matrix is often given a capital letter as an identifier. An element within the matrix is specified using the name of the matrix in lowercase, with its row then column (in that order) shown as subscript. See the following example:

\[
A =
\begin{bmatrix}
a_{00} & a_{01} \\
a_{10} & a_{11}
\end{bmatrix}
\]

### Multiplying a Matrix by a Scalar

The process of multiplying a matrix by a scalar is a simple one: multiply every item in the matrix by the scalar.

If A is the matrix:

![A times B part 2](/assets/images/2019-06-24/MatrixScalarA.png)

Then multiplying the matrix by a scalar produces:

![A times B part 2](/assets/images/2019-06-24/MatrixScalarLambdaA.png)

For example, if the scalar multiplier is 2 and A's values are:

![A times B part 2](/assets/images/2019-06-24/MatrixScalarALambda.png)

Then the result is as follows:

![A times B part 2](/assets/images/2019-06-24/MatrixScalarExample.png)

If the scalar is a complex number and/or the matrix contains complex numbers, the procedure does not change. You calculate the products using the rules of complex number multiplication, which we looked at earlier.

Okay, so we've gone over some basic math operations that you need to know to follow along. Let's move on to something more fun.

## Describing Quantum State with Dirac Notation

Dirac notation (also known as bra-ket notation) is everywhere in quantum theory. It's used to describe quantum states. You can think of it as matrix shorthand.

A single qubit with the zero basis state can be written as a **ket**, like so:

\|0〉

This reads as "ket zero."

Conversely, a qubit with a one basis state, can be written as:

\|1〉

> **NOTE:** In some texts, \|0〉 and \|1〉 are presented as \|&uarr;〉 (spin-up) and \|&darr;〉 (spin-down), respectively. When you visualize a qubit on a three dimensional sphere, \|0〉 is up at the north pole and \|1〉 is down at the south pole. I use \|0〉 and \|1〉 exclusively in this series. 

Recall that \|0〉 represents the column vector [1, 0]<sup>T</sup>, and 1 represent [0, 1]<sup>T</sup>.

In Dirac notation, the values within the ket&mdash;between the vertical line character '\|' and the angled bracket '〉'&mdash;are tensor products.

The symbol '⊗' is used to denote the tensor product of two matrices. It is calculated by multiplying each item in the first matrix by all items in the second matrix, as illustrated:

$$
\begin{alignedat}{2}
\begin{bmatrix} a_{1} \\ a_{2} \end{bmatrix}
\otimes
\begin{bmatrix} b_{1} \\ b_{2} \end{bmatrix}
&\!=\!
\begin{bmatrix}
a_{1}\begin{bmatrix} b_{1} \\ b_{2} \end{bmatrix} \\
a_{2}\begin{bmatrix} b_{1} \\ b_{2} \end{bmatrix}
\end{bmatrix}
&\!=\!
\begin{bmatrix}
a_{1} b_{1} \\
a_{1} b_{2} \\
a_{2} b_{1} \\
a_{2} b_{2}
\end{bmatrix}
\end{alignedat}
$$







![Tensor product example](/assets/images/2019-06-24/TensorProduct.png)

Tensor products are condensed within Dirac notation, like so:

$\lvert 1 \rangle \otimes \lvert 0 \rangle = \lvert 10 \rangle$

You can see how they are combined by calculating the tensor product of the matrices, like so:

![Tensor Product](/assets/images/2019-06-24/ZeroTensorOne.png)

In a quantum circuit, the inputs to the circuit are combined as tensor products. We explore this later in the series.

For qubits, the Dirac notation lends itself beautifully to a binary representation. Notice below how entries in the matrix correspond to the binary, and in particular how the first entry in the matrix corresponds to 0 and not 1.  

![Ket Binary](/assets/images/2019-06-24/KetBinary.png)

> **NOTE:** In some texts, the leading 0's are omitted and replaced with a subscript indicating the length. So that \|0010〉 becomes \|10<sub>4</sub>〉. I'll not be using that convention however.

If the Dirac notation points to the left rather than the right, as in: &lang;0\|, this is called a bra. Together they form a bra-ket. 

### Deriving a Bra from a Ket (and Vice Versa)

The bra is the [conjugate transpose](https://en.wikipedia.org/wiki/Conjugate_transpose) of the ket. The conjugate transpose is also known as the adjoint matrix, and yet another name is the Hermitian transpose.

To obtain the conjugate transpose, the matrix is rotated and each entry is complex conjugated. For a single column matrix, it just means we turn it horizontally and then take the complex conjugate of each entry. See Figure x. 

The complex conjugate simply means changing the sign of the imaginary part. For example, if z = 2 + 3i, then the complex conjugate is <span style="text-decoration: overline">z</span> = 2 - 3i.

<figure><img alt="Performing a conjugate transpose" src="/assets/images/2019-06-24/Adjoint.png"><figcaption>Figure x. Performing a conjugate transpose</figcaption></figure>

> **Why Complex Numbers?** You may wonder why quantum theory relies so heavily on complex numbers. Well, if you add two positive real numbers, the result will always increase. That's not the case with Complex numbers. You can add two complex numbers and produce a smaller result. In fact, they may even cancel each other out. This is referred to as interference, and it's sometimes employed deliberately to eliminate unwanted states in quantum algorithms. <!-- REF Quantum_Com.pdf page 88 and 89 -->

In the following examples we use the variables a and b, such that a,b &isin; C<sup>d</sup>. In other words, a and b denote single column matrices of complex numbers with the number of rows equal to d. Most of the time when we are working with qubits, so the dimension count is 2.

The following illustrates obtaining a bra from a ket:

![Bra equals ket adjoint](/assets/images/2019-06-24/BraKetAdjoint.png)

This process is reversible. To obtain a ket from a bra, do the same thing again; calculate the adjoint.

When combined, a bra-ket &lang;b\|a〉 represents the inner product of b and a. It's sometimes written as &lang;b,a〉. The inner product is the sum of the products of corresponding items. This results in a complex scalar value (with or without an imaginary part). Scalar means that it's not a vector; it's a magnitude without direction.

![Bra equals ket adjoint](/assets/images/2019-06-24/InnerProduct.png)

All quantum states are normalized, that is &lang;a\|a〉 = 1. This has important implications for the probability of states. We return to it in a later section.

We've seen that quantum theory relies on complex numbers and vectors to describe quantum particles. This algebraic structure is termed a *complex vector space* and also known as [Hilbert Space](https://en.wikipedia.org/wiki/Hilbert_space).

Another combination of the Dirac notation, which I include for completeness, is the ket-bra. It's written like this \|a〉&lang;b\| or sometimes \|aXb\|. A ket-bra is the tensor (or outer) product and represents a d by d matrix, illustrated as follows:

![Ket-Bra](/assets/images/2019-06-24/KetBra.png)

> **TIP:** In quantum theory, it's common to see the Greek characters &phi; (phi) and &psi; (psi) used as placeholders in bras and kets. For example &lang;&phi;\|&psi;〉 Don't be put off by the Greek characters, foreign notation, and seemingly complex algebra. It all appears far more complex than it actually is.

## Exploring Quantum Superposition

We learned in an earlier section that when you measure a qubit, its quantum state collapses to either 0 or 1. To which value it collapses depends on the way the qubit has been configured. You can change the probability of a qubit collapsing to a particular value. By doing so, you place the qubit into a superposition.

Now, for a qubit that is in a pure basis state, either \|0〉 or \|1〉, the result is predetermined. It has a 100% chance of collapsing to its respective value. In other words, if you measure a qubit that was placed in the \|0〉 state, for example, you always get 0 because the probability of collapsing to 0, is 1; and the probability of collapsing to 1, is 0.

But, if you employ, for example, a Hadamard gate in your quantum circuit, you can split the probability of the qubit collapsing to 0 or 1, to a 50/50 chance either way.

When a qubit is in a superposition, its value is undetermined until it's measured. In fact, a qubit is said to be simultaneously 0 and 1 until then. It's both! 

This is such an unusual phenomenon, physicists have been unable to explain it using classical physics. Yet, it has been widely observed experimentally. Remember the old double slit experiment? A photon seemingly goes everywhere, interfering with itself, before landing on a spot. So to does our qubit exist in all observable states until it is measured.

While there the probability of any observable state is essentially random, you can, fortunately, modify the probabilities of the observable states. When you do this, you place the qubit into a superposition. 

> **Disambiguating the Term "State"** When one or more qubits make up a quantum system, this system has an overall quantum state at any one time. However, the system has a set of distinct states that it may collapse to when measured. We'll call these states: observable states.

To recap, as quantum engineers, we have the opportunity to manipulate the probabilities using quantum gates in our quantum circuits. We can also combine qubits in such a way that they correlate with one another. We can even leverage quantum entanglement to instantly affect the state of one qubit with another qubit, even if the qubits are far away from one another. We delve deeper into quantum entanglement in a later article. <!-- REF -->

The quantum state of one or more qubits can be described using Dirac notation and simple algebra. Observable states and associated probabilities comprise the qubit's superposition. 

A single qubit can be described by a linear combination of \|0〉 and \|1〉, such that:

\|&Psi;〉 = &alpha;\|0〉 + &beta;\|1〉

&alpha; and &beta; are known as complex amplitudes or probability amplitudes. The name 'amplitude' comes from the fact that a quantum state is a wave, and a wave is characterized by its amplitudes.  [Reference page 106 "Quantum Computing for Computer Scientists"]

## Calculating Observable State Probability

To calculate the probability of qubit collapsing to a particular state, we take the square of the modulus of its coefficient. This is known as the [Born rule](https://en.wikipedia.org/wiki/Born_rule). 

So, for the \|&psi;〉 example shown above, the probability of \|0〉 is \|&alpha;\|<sup>2</sup>.

### Calculating the Modulus

The modulus of a complex number is calculated like so:

![Calculating the modulus of a complex number](/assets/images/2019-06-24/ComplexModulus.png)

To calculate the probability we square that number. All together this can be written succinctly as shown:

<!-- P(x<sub>i</sub>) = \|&lang;x<sub>i</sub>\|&psi;〉\|<sup>2</sup> -->
![Probability of Xi equals square of the braket](/assets/images/2019-06-24/PXi.png)

This is saying that to calculate the probability of the observable state X<sub>i</sub> (which is either going to be 0 or 1 for a qubit), you square the modulus of the dot product.
In other words, you project the state your interested in onto the superposition.

Don't worry if the algebra doesn't make sense yet. Next we look at an example, and then we further illustrate it using matrices.

Say our qubit superposition is given by the following:

![Example superposition](/assets/images/2019-06-24/P0_0.png)

Then the probability of collapsing to 0 is given by:

![Probability of collapsing to 0](/assets/images/2019-06-24/P0_1.png)

Now, we can reduce &lang;0\|0〉 to 1, as shown:

![bra 0 ket 0 = 1](/assets/images/2019-06-24/P0_2.png)

and because &lang;0\| and \|1〉 are orthogonal, there inner product is 0, as shown:

![bra 0 ket 1 = 0](/assets/images/2019-06-24/P0_3.png)

So, if we replace those brakets in our probability formula, we see that:

![P(0) = 1/3](/assets/images/2019-06-24/P0_4.png)

Alternatively, we can look at the same problem, but substitute matrices for our states and calculate the probability that way.

![P(1) = 1 - P(0)](/assets/images/2019-06-24/P0_6.png)

Hopefully the Dirac notation version makes a bit more sense now.

### Probability Distribution of Quantum States

We know that the sum of the probabilities in a probability distribution is always 1. And we learned earlier that all quantum states are normalized, i.e., &lang;a\|a〉 = 1. For orthonormal bases ([0, 1]<sup>&dagger;</sup>, [1, 0]<sup>&dagger;</sup> and the like) this means that the observable states are in a probability distribution and so their probabilities must also add up to 1. 

![The coefficient squares sum to 1](/assets/images/2019-06-24/SumOfP.png)

Therefore, we can calculate P(1) like so:

![P(1) = 1 - P(0)](/assets/images/2019-06-24/P0_5.png)

## Creating Multi-Qubit States

So far we've looked at the quantum states of single qubits. We can, of course, create quantum states with multiple qubits. These are known as multi-partite quantum states.

To do so, we combine states using tensor products. For example, if qubit A is in state \|&psi;〉<sub>A</sub> = \|0〉 and qubit B is in state \|&psi;〉<sub>B</sub> = \|1〉, then the total state is given by:

\|&psi;〉<sub>AB</sub> = \|0〉<sub>A</sub> &otimes; \|1〉<sub>B</sub> = \|01〉<sub>AB</sub>.

In this case, we can measure the state of qubit A without collapsing the state of qubit B. The individual states are said to be uncorrelated.

We can, however, place qubits into a state, where measuring one affects another. This is known as entanglement.

### Entangling Qubits

For instance, take a well known state (one of the Bell states, which we discuss later), this state describes two qubits in superposition:

![Phi Plus Bell state](/assets/images/2019-06-24/BellEntangled.png)

The state of the qubits when measured will have a 50% chance of being either 00 or 11.

If we were to measure just one of the qubits, it would cause the other's state to immediately collapse to the same value. The qubits are said to be entangled. Even if the entangled qubits are far away from each other, possibly light years. This is what Einstein described as "spooky action at a distance."

### Determining if Qubits are Entangled

When we look at the mathematics governing entanglement, we can use the matrix representation to tell us if the qubits are entangled.

A vector that can be written as the tensor product of two vectors is called **separable**. <!-- REF Quantum_Com.pdf page 89 -->
In contrast, if the tensor product state of two qubits cannot be factored, they are said to be entangled. This is pointed out in Andrew Helwer's [introductory video on quantum computing](https://www.microsoft.com/en-us/research/video/quantum-computing-computer-scientists). 

For example, if we take the state \|01〉, and forget for a moment that we know what the tensor product representation is already.

![\|&phi;+〉 resultant matrix](/assets/images/2019-06-24/Ket01MatrixABCD.png)

We can see that ac = 0, ad = 1, bc = 0, and bd = 0. If we solve for a, b, c, and d; we get a = 1, b = 0, c = 0, and d = 1. We can factor it, therefore we know \|01〉 is separable and not entangled.

![\|&phi;+〉 resultant matrix](/assets/images/2019-06-24/Ket01Matrix.png)

In contrast, if we look at the \|&phi;+〉 state, it is a two qubits state in equal superposition. The matrix representation is calculated below:

![\|&phi;+〉 resultant matrix](/assets/images/2019-06-24/PhiPlusMatrix.png)

In this case the matrix is not factorable. ac = 1/&radic;2, ad = 0, bc = 0, bd = 1/&radic;2. There is no solution to a, b, c, and d.
Therefore, the matrix is not separable and so the qubits are entangled. In fact, in this case, because of the equal probability of the two states \|00〉 and \|11〉, \|&phi;+〉 is said to be maximally entangled. They're as entangled as you can get.

<!--

There are some topics I've deliberately neglected to present or cut-out. The content presented in the article is rather difficult, and I didn't want to overdo it with more advanced topics.

When you can write the state as \|&psi;〉<sub>A</sub> &otimes; \|&psi;〉<sub>B</sub>, the state is said to be uncorrelated. If you cannot write the state as a tensor product of two states, then the overall state is said to be correlated. Correlated states come in two varieties: separable and entangled. We look at examples of correlated states next.

The resulting state is called an uncorrelated state; the qubits are independent of one another. We can, however, create a superposition that affects both qubits, in which case they are said to be correlated.

There are three ways qubits

* uncorrelated
* correlated - separable
* correlated - entangled

### Understanding Pure and Mixed State

So far we've seen that a qubit can be expressed as a single ket, like so:

\|&psi;> = &alpha;\|0〉 + &beta;\|1〉 

When a qubit can be expressed like this, it is said to have a pure state, and is in a **coherent** superposition.

-->

But, how do we create a Bell state? We explore that later in the article. Next we look at visualizing single qubit states.

## Visualizing a Qubit on the Bloch Sphere

Many operations on single qubits can be neatly visualized on a 3 dimensional unit sphere, known as the Bloch sphere. See figure x.

A qubit can be represented as a line of length 1 from the center of the sphere to the sphere's surface. 

At the north poll sits basis state \|0〉; at the south, \|1〉. Before collapsing into a basis state, a qubits superposition may be located anywhere on the Bloch sphere. You can think of &theta; as latitude and &phi; as longitude. As we move vertically, north or south, the latitude changes (&theta;), and as we move horizontally the longitude (&phi;) changes.

While the latitude affects the probability of the qubit collapsing to a particular basis state, the longitude does not. The longitude is referred to as the qubit's phase.

<figure><a title="Glosser.ca [CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0)], via Wikimedia Commons" href="https://commons.wikimedia.org/wiki/File:Bloch_Sphere.svg"><img alt="Bloch Sphere" src="/assets/images/2019-06-24/BlochSphere.png"></a><figcaption>Figure x. Bloch Sphere</figcaption></figure>

A qubit superposition can be written 

\|&psi;〉 = &alpha; \|0〉 + &beta; \|1〉

where &alpha; and &beta; are its probability amplitudes. They are two complex numbers.

### Converting between Cartesian and Polar Representations

Recall that a complex number consists of a real part, x, and an imaginary multiplier, y: 

c = x + iy 

A complex number can be represented by just x and y. The pair (x, y) is called its Cartesian representation. It can be graphed on a two dimensional Cartesian plane. Such a graph is called an [Argand diagram](https://en.wikipedia.org/wiki/Complex_plane#Argand_diagram). See figure x.

The [arg](https://en.wikipedia.org/wiki/Argument_(complex_analysis)) function can be used to calculate &theta;. In this case, arg is equivalent to atan2, as shown:

Arg(x + iy) = atan2(y, x) = tan<sup>-1</sup>(y/x)

Later in this section you see how to use the Arg function to calculate angles (&theta;, &phi;) on the Bloch sphere.

<figure><a title="Glosser.ca [CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0)], via Wikimedia Commons" href="https://en.wikipedia.org/wiki/File:Argandgaussplane.png"><img alt="Argand diagram" src="/assets/images/2019-06-24/Argandgaussplane.png"></a><figcaption>Figure x. Argand diagram</figcaption></figure>

We can convert the Cartesian coordinates to polar representation. The polar coordinates consist of the modulus &rho; and the angle &theta;. Recall that to calculate the modulus we use:

![Calculating the modulus of a complex number](/assets/images/2019-06-24/RhoModulus.png)

To calculate the angle, we use:

![Calculating the angle](/assets/images/2019-06-24/ThetaTan.png)

To convert back from polar to Cartesian representation, use:

<!-- x = ρ cos(θ), y = ρ sin(θ) -->

![Calculating the angle](/assets/images/2019-06-24/XPCos.png)

### Locating the Qubit on the Bloch Sphere

It's okay to skim through this section. While its useful to understand how states are translated to the Bloch sphere, you can return to this at a later stage.

&alpha; and &beta; can be visualized on the Bloch sphere as a point corresponding to the two angles (&theta;, &phi;).

It turns out that because \|&alpha;\|<sup>2</sup> + \|&beta;\|<sup>2</sup> = 1 we can calculate a qubit's position on the Bloch sphere using the following:

![A point on the Bloch sphere](/assets/images/2019-06-24/KetPsiCos.png)

where 0 &le; &theta; &le; &pi;, 0 &le; &phi; &le; 2&pi;

That gives us

&alpha; = cos(&theta;/2), &beta; = e<sup><i>i</i>&phi;</sup> sin(&theta;/2)

To find the angles use

&theta; = 2 cos<sup>-1</sup>(\|&alpha;\|)

and

&phi; = arg(&beta;) - arg(&alpha;)

> **NOTE:** You can also find these values via the state's [density matrix](https://en.wikipedia.org/wiki/Density_matrix), which is calculated by its ket-bra: &rho; = \|&psi;〉&lang;&psi;\|. But that's outside the scope of this article.


## Conclusion

In this article, we explored the differences between qubits and classical bits. We looked at the computation basis for qubits. We saw how to describe quantum state using Dirac notation. We observed that qubits can be placed into superposition, and saw how to calculate the probability of observable states. We also saw how an entangled qubit can affect the quantum state of the pair. Finally we took a ride around the Block sphere, and saw how a qubit's state can be visualized in 3 dimensions.

In the next part, we explore how quantum gates are used to build quantum circuits, which ultimately puts us on the road to materializing quantum algorithms. I hope you'll join me.

Thanks for reading and I hope you found this article useful. If so, then I'd appreciate it if you would please rate it and/or leave feedback below.

## References

1. Yanofsky, N., & Mannucci, M. (2008). *Quantum Computing for Computer Scientists*.
2. Anton, H. (2000). *Elementary Linear Algebra* (8th ed.). Wiley.
3. Nielsen, M., & Chuang, I. (2010). *Quantum Computation and Quantum Information* (10th ed.). Cambridge University Press, Cambridge, UK.
4. Glendinning, I. (2005). *The Bloch Sphere*. Accessed 10 June 2019, from http://www.vcpc.univie.ac.at/~ian/hotlist/qc/talks/bloch-sphere.pdf
5. Dutta, S. (2019). *If quantum gates are reversible how can they possibly perform irreversible classical AND and OR operations?* Accessed 9 June 2019, from https://quantumcomputing.stackexchange.com/questions/131/if-quantum-gates-are-reversible-how-can-they-possibly-perform-irreversible-class
6. Wolf, R. (n.d.). *Quantum Computing: Lecture Notes*. Accessed 9 June 2019, from https://homepages.cwi.nl/~rdewolf/qcnotes.pdf
7. Wikipedia contributors. (2019). *Quantum logic gate*. Accessed 9 June 2019, from https://en.wikipedia.org/wiki/Quantum_logic_gate
8. Glendinning, I. (2010). *Rotations on the Bloch Sphere*. Accessed 9 June 2019, from http://www.vcpc.univie.ac.at/~ian/hotlist/qc/talks/bloch-sphere-rotations.pdf
9. Hui, J. (2018). *What are Qubits in Quantum Computing?* Accessed 9 June 2019, from https://medium.com/@jonathan_hui/qc-what-are-qubits-in-quantum-computing-cdb3cb566595
