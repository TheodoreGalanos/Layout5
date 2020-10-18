# Layout5
A mixed-initiative, co-creativity layout generation tool for Rhino/GH, done during the AECTech 2020 Hackathon

## Getting Started

### Prerequisites:
To get everything working, set up a remote Rhino Compute server on an Amazon AWS EC2 Client.
Follow the instructions here:
https://github.com/mcneel/compute.rhino3d/blob/master/docs/deploy.md

Install Python on the remote server. Your best shot is Anaconda:
https://www.anaconda.com/products/individual#windows

Install the folloiwng packages:
- pyTorch:
https://pytorch.org/get-started/locally/
conda install pytorch torchvision cudatoolkit=10.2 -c pytorch
- Kornia:
https://kornia.github.io/
conda install -c conda-forge kornia 
(careful here, as the regular pip install kornia won't work with the BYOL we use...)
- umap:
https://umap-learn.readthedocs.io/en/latest/
conda install -c conda-forge umap-learn


Make sure you have the following Grasshopper plugins installed (also on the compute server - get them from Food4Rhino):
- cPython
- Ladybug/Honeybee (Legacy version)
- Pufferfish
- Human

Then follow the Appserver set up:
https://github.com/mcneel/compute.rhino3d.appserver/blob/main/docs/heroku.md

and you're good to go!! :)
ours is here:

https://layout5.herokuapp.com/example/
