import os
import random

# A collection of meaningful, high-quality English texts about computer science, literature, and science.
paragraphs = [
    # Topic 1: Huffman Coding & Compression
    "Huffman coding is an entropy encoding algorithm used for lossless data compression. The algorithm was developed by David A. Huffman while he was a Ph.D. student at MIT, and published in the 1952 paper 'A Method for the Construction of Minimum-Redundancy Codes'. The process of Huffman coding involves analyzing the frequency of characters in a body of text, constructing a binary tree based on these frequencies, and assigning variable-length binary codes to each character. The most frequent characters receive the shortest codes, while less frequent characters receive longer codes. This results in a highly optimized binary representation that can significantly reduce the overall size of the data.",
    
    "Lossless data compression is a class of data compression algorithms that allows the original data to be perfectly reconstructed from the compressed data. By contrast, lossy data compression permits some loss of information, which is common in audio, video, and image compression where minor changes are imperceptible to human senses. Lossless compression is crucial for text, database files, executable programs, and medical images, where any alteration in the data could lead to severe errors or loss of utility. Popular lossless compression formats include GZIP, PNG, ZIP, and FLAC.",

    # Topic 2: Classic Literature (Pride and Prejudice)
    "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters. My dear Mr. Bennet, said his lady to him one day, have you heard that Netherfield Park is let at last? Mr. Bennet replied that he had not. But it is, returned she; for Mrs. Long has just been here, and she told me all about it. Mr. Bennet made no answer. Do you not want to know who has taken it? cried his wife impatiently. You want to tell me, and I have no objection to hearing it. This was invitation enough.",

    # Topic 3: Sherlock Holmes
    "To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position. He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer—excellent for drawing the veil from men's motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results.",

    # Topic 4: Technical writing on Trees and Graphs
    "In computer science, a tree is a widely used abstract data type that represents a hierarchical tree structure with a set of linked nodes. Each node in a tree has zero or more child nodes, which are below it in the hierarchy. A node that has a child is called the child's parent node. A node has at most one parent. The topmost node in a tree is called the root node. Being the structural origin, all other nodes can be reached from it by following edges or links. Conversely, nodes at the bottom of the tree that do not have any children are called leaf nodes. Trees are specialized cases of graphs, where no cycles are permitted. They are crucial for implementing databases, file systems, and compression algorithms like Huffman coding.",

    # Topic 5: Artificial Intelligence
    "Artificial intelligence is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. Leading AI textbooks define the field as the study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals. Popularly, the term artificial intelligence is often used to describe machines that mimic cognitive functions that humans associate with the human mind, such as learning and problem-solving. As machines become increasingly capable, tasks considered to require intelligence are often removed from the definition of AI, a phenomenon known as the AI effect.",

    # Topic 6: Space Exploration and Science
    "Space exploration is the ongoing discovery and exploration of celestial structures in outer space by means of continuously evolving and growing space technology. While the study of space is carried out mainly by astronomers with telescopes, the physical exploration of space is conducted both by unmanned robotic space probes and human spaceflight. Physical exploration of space has been used as a source for national prestige, technological innovation, international cooperation, and scientific discovery. The exploration of space has been a driving force for humanity to push the boundaries of science and engineering, leading to revolutionary breakthroughs in materials, telecommunications, and computing.",

    # Topic 7: The Gzip Format
    "Gzip is a file format and a software application used for file compression and decompression. The program was created by Jean-loup Gailly and Mark Adler as a free software replacement for the compress program used in early Unix systems. The basic algorithm used in gzip is DEFLATE, which is a combination of LZ77 (Lempel-Ziv) compression and Huffman coding. LZ77 identifies duplicate substrings in the input stream and replaces them with references (distance and length pairs). The resulting literal values and length/distance pairs are then compressed using Huffman codes. This two-phase compression process makes gzip highly efficient for compressing text files, source code, and other redundant datasets."
]

def generate_file(filename, target_size_mb):
    target_bytes = int(target_size_mb * 1024 * 1024)
    print(f"Generating '{filename}' of size approximately {target_size_mb} MB ({target_bytes} bytes)...")
    
    # We will generate chapters to give the document a meaningful structure.
    chapter_num = 1
    current_bytes = 0
    
    # Seed the random number generator to ensure reproducibility if desired
    random.seed(42)
    
    with open(filename, 'w', encoding='utf-8') as f:
        # Document title
        title = "THE ULTIMATE COMPUTER SCIENCE AND CLASSIC LITERATURE COMPILATION\n"
        title += "===================================================================\n\n"
        f.write(title)
        current_bytes += len(title.encode('utf-8'))
        
        while current_bytes < target_bytes:
            # Start a chapter
            chap_header = f"\nCHAPTER {chapter_num}: "
            if chapter_num % 3 == 1:
                chap_header += "The Principles of Lossless Data Compression and Systems Coding"
            elif chapter_num % 3 == 2:
                chap_header += "Extracts from Classic Nineteenth-Century English Novels"
            else:
                chap_header += "Theoretical Foundations of Graphs, Trees, and Intelligent Agents"
            
            chap_header += "\n" + "-" * len(chap_header.strip()) + "\n\n"
            f.write(chap_header)
            current_bytes += len(chap_header.encode('utf-8'))
            
            # Write several paragraphs for this chapter
            num_paragraphs = random.randint(15, 25)
            for _ in range(num_paragraphs):
                # Pick a random paragraph
                p_text = random.choice(paragraphs)
                # To make it slightly dynamic and unique, we can shuffle sentences or inject paragraph variation
                # We can write it as is for consistency and clean readability.
                f.write(p_text + "\n\n")
                current_bytes += len((p_text + "\n\n").encode('utf-8'))
                
                if current_bytes >= target_bytes:
                    break
            
            chapter_num += 1
            
    actual_size = os.path.getsize(filename)
    print(f"Generation complete! File '{filename}' created.")
    print(f"Actual size: {actual_size} bytes ({actual_size / (1024 * 1024):.2f} MB)")

if __name__ == "__main__":
    # Target size: 9.0 MB
    generate_file("test_9mb.txt", 9.0)
